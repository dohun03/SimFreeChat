import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from 'src/redis/redis.service';
import { ChatService } from './chat.service';
import { OnEvent } from '@nestjs/event-emitter';
import { MessagesService } from 'src/messages/messages.service';
import { map } from 'rxjs';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
  pingInterval: 60000,  // 60초마다 ping
  pingTimeout: 60000 * 5,   // 5분 동안 pong 없으면 연결 끊음
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  private userSocket: Map<number, Map<string, number>> = new Map();

  constructor(
    private readonly chatService: ChatService,
    private readonly messagesService: MessagesService,
    private redisService: RedisService,
  ) {}
  
  handleConnection(client: Socket) {
    console.log(`WEBSOCKET CONNECT: ${client.id}`);
    // this.server.sockets.sockets.forEach((socket, id) => {
    //   console.log("소켓 아이디:",id);
    // });
  }

  handleDisconnect(client: Socket) {
    // 자동으로 소켓 제거된 시점
    console.log(`WEBSOCKET DISCONNECT: ${client.id}`);
    // userSocket에서 해당 소켓 제거
    for (const [userId, socketMap] of this.userSocket.entries()) {
      if (socketMap.has(client.id)) {
        socketMap.delete(client.id);
        if (socketMap.size === 0) {
          this.userSocket.delete(userId);
        }
        break;
      }
    }
  }

  // 소켓 추가 메서드
  addUserSocket(userId: number, socketId: string, roomId: number) {
    if (!this.userSocket.has(userId)) {
      this.userSocket.set(userId, new Map());
    }
    this.userSocket.get(userId)!.set(socketId, roomId);

    this.server.sockets.sockets.forEach((socket, id) => {
      console.log("추가 후 소켓들:",id);
    });
  }

  // 강제 소켓 삭제 메서드
  removeUserSocket(userId: number, roomId: number) {
    const socketMap = this.userSocket.get(userId);
    if (!socketMap) return;

    const deleteId: string[] = [];
    
    for (const [sId, rId] of socketMap.entries()) {
      if (rId===roomId) {
        deleteId.push(sId);
      }
    }

    for (const sId of deleteId) {
      const socket = this.server.sockets.sockets.get(sId);
      if (socket) {
        socket.emit('forcedDisconnect', { 
          msg: "새 탭에서 연결 됨",
        });
        socket.disconnect(true);
        socketMap.delete(sId);
        console.log("삭제완료",sId);
      }
    }
  }

  // WebSocket 이벤트(@SubscribeMessage) 방식
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: Socket, payload: { roomId: number }) {
    const cookieHeader = client.handshake.headers.cookie; // 쿠키 추출
    const sessionId = cookieHeader
      ?.split('; ')
      .find(c => c.startsWith('SESSIONID='))
      ?.split('=')[1];

    if (!sessionId) {
      console.warn('세션이 존재하지 않습니다.');
      client.disconnect();
      return;
    }

    const user = await this.redisService.getSession(sessionId);
    if (!user) {
      console.warn('세션에 유저 ID가 없습니다.');
      client.disconnect();
      return;
    }

    // 방 입장 로직
    const { isUserInRoom, roomUsers, roomUserCount } =
      await this.chatService.joinRoom(payload.roomId, user.userId);

    this.removeUserSocket(user.userId, payload.roomId);
    this.addUserSocket(user.userId, client.id, payload.roomId);
    client.join(payload.roomId.toString());
    
    // 방 전체에 입장 메시지 전송
    this.server.to(payload.roomId.toString()).emit('systemMessage', {
      msg: `${user.username} 님이 입장했습니다.`,
      roomUsers,
      roomUserCount,
    });
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(client: Socket, payload: { roomId: number }) {
    const cookieHeader = client.handshake.headers.cookie; // 쿠키 추출
    const sessionId = cookieHeader
      ?.split('; ')
      .find(c => c.startsWith('SESSIONID='))
      ?.split('=')[1];

      console.log("why",payload, sessionId);

    if (!sessionId) {
      console.warn('세션이 존재하지 않습니다.');
      client.disconnect();
      return;
    }

    const user = await this.redisService.getSession(sessionId);
    if (!user) {
      console.warn('사용자가 존재하지 않습니다.');
      client.disconnect();
      return;
    }

    const { roomUsers, roomUserCount } =
      await this.chatService.leaveRoom(payload.roomId, user.userId);

    client.leave(payload.roomId.toString());

    // 방 전체에 퇴장 메시지 전송
    this.server.to(payload.roomId.toString()).emit('systemMessage', {
      msg: `${user.username} 님이 퇴장했습니다.`,
      roomUsers,
      roomUserCount,
    });
  }

  // EventEmitter 이벤트(@OnEvent) 방식
  @OnEvent('leaveAllRooms')
  async handleLeaveAllRooms(payload: { roomId: number, roomUserCount: number, roomUsers: any, deletedUser: any }) {
    const { roomId, roomUserCount, roomUsers, deletedUser } = payload;
    
    this.removeUserSocket(roomUsers.id , roomId);

    this.server.to(roomId.toString()).emit('systemMessage', {
      msg: `${deletedUser.username} 님이 퇴장했습니다.`,
      roomUsers,
      roomUserCount,
    });
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, payload: { roomId: number, content: string}) {
    const cookieHeader = client.handshake.headers.cookie; // 쿠키 추출
    const sessionId = cookieHeader
      ?.split('; ')
      .find(c => c.startsWith('SESSIONID='))
      ?.split('=')[1];

    if (!sessionId) {
      console.warn('세션이 존재하지 않습니다.');
      client.disconnect();
      return;
    }

    const user = await this.redisService.getSession(sessionId);
    if (!user) {
      console.warn('사용자가 존재하지 않습니다.');
      client.disconnect();
      return;
    }

    const message = await this.messagesService.createMessage({
      roomId: payload.roomId, 
      userId: user.userId, 
      content: payload.content
    });

    this.server.to(payload.roomId.toString()).emit('chatMessage', message);
  }
}
