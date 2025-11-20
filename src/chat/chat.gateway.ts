import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from 'src/redis/redis.service';
import { ChatService } from './chat.service';
import { OnEvent } from '@nestjs/event-emitter';
import { MessagesService } from 'src/messages/messages.service';
import { map } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { RoomUsersService } from 'src/room-users/room-users.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { LeaveRoomDto } from './dto/leave-room.dto';
import { DeleteMessageDto } from './dto/delete-message.dto';
import { KickUserDto } from './dto/kick-user.dto';
import { BanUserDto } from './dto/ban-user.dto';

@WebSocketGateway({
  cors: {
    origin: process.env.SOCKET_ORIGIN,
    credentials: true,
  },
  pingInterval: 60000 * 1,  // 1분마다 ping
  pingTimeout: 60000 * 2,   // 2분 동안 pong 없으면 연결 끊음
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  private userSockets: Map<number, Map<string, number>> = new Map();

  constructor(
    private readonly chatService: ChatService,
    private readonly messagesService: MessagesService,
    private readonly roomUsersService: RoomUsersService,
    private readonly redisService: RedisService,
  ) {}
  
  handleConnection(client: Socket) {
    console.log(`[CONNECT] ${client.id} - ${client.handshake.address}`);
  }

  handleDisconnect(client: Socket) {
    // 자동으로 소켓 제거된 시점
    console.log(`[DISCONNECT] ${client.id}`);
    // userSockets에서 해당 소켓 제거
    for (const [userId, socketMap] of this.userSockets.entries()) {
      if (socketMap.has(client.id)) {
        socketMap.delete(client.id);
        if (socketMap.size === 0) {
          this.userSockets.delete(userId);
        }
        break;
      }
    }
  }

  // 소켓 추가 메서드
  addUserSocket(userId: number, socketId: string, roomId: number) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Map());
    }
    this.userSockets.get(userId)!.set(socketId, roomId);
  }

  // 강제 소켓 삭제 메서드
  removeUserSocket(roomId: number, userId: number) {
    const socketMap = this.userSockets.get(userId);
    if (!socketMap) return;

    const deleteId: string[] = [];
    
    // socketMap을 순회하면서 맵의 roomId와 받아온 roomId 일치 여부 확인
    // 소켓 아이디를 deleteId 배열에 저장
    for (const [sId, rId] of socketMap.entries()) {
      if (rId == roomId) {
        deleteId.push(sId);
      }
    }

    // deleteId 배열에 저장된 소켓 찾아서 끊기.
    for (const sId of deleteId) {
      const socket = this.server.sockets.sockets.get(sId);
      if (socket) {
        socket.emit('forcedDisconnect', {
          msg: "채팅방과 연결이 끊겼습니다.",
        });
        socket.disconnect(true);
        socketMap.delete(sId);
      }
    }
  }

  // 쿠키 파싱 후 세션 확인용 메서드
  private async getUserFromSession(client: Socket) {
    const cookieHeader = client.handshake.headers.cookie;
    const sessionId = cookieHeader
      ?.split('; ')
      .find(c => c.startsWith('SESSIONID='))
      ?.split('=')[1];
  
    if (!sessionId) throw new Error('세션이 존재하지 않습니다.');
  
    const user = await this.redisService.getSession(sessionId);
    if (!user) throw new Error('세션 정보가 없습니다.');
  
    return user;
  }

  // DTO 수동 유효성 검사 메서드
  private async validateDto<T extends object>(dtoClass: new () => T, payload: any): Promise<T> {
    const dto = plainToInstance(dtoClass, payload);
    const errors: ValidationError[] = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  
    if (errors.length > 0) {
      const messages = errors
        .map(err => Object.values(err.constraints || {}))
        .flat()
        .join(', ');
      throw new Error(messages);
    }
  
    return dto;
  }
  
  // WebSocket 이벤트(@SubscribeMessage) 방식
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    try {
      const dto = await this.validateDto(JoinRoomDto, payload);
      const user = await this.getUserFromSession(client);
      const { roomId, password } = dto;
      const { roomUsers, afterCount, joinUser } = await this.chatService.joinRoom(roomId, user.userId, password);

      // 방 입장 로직
      this.removeUserSocket(roomId, user.userId);
      this.addUserSocket(user.userId, client.id, roomId);
      client.join(roomId.toString());
  
      // 방 전체에 입장 메시지 전송
      this.server.to(roomId.toString()).emit('roomEvent', {
        msg: `${joinUser.name} 님이 입장했습니다.`,
        roomUsers,
        roomUserCount: afterCount,
      });
    } catch (err) {
      console.error(err.message);
      client.emit('forcedDisconnect', { msg: err.message });
      client.disconnect();
    }
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    try {
      const dto = await this.validateDto(LeaveRoomDto, payload);
      const user = await this.getUserFromSession(client);
      const { roomUsers, roomUserCount, leaveUser } = await this.chatService.leaveRoom(dto.roomId, user.userId);

      client.leave(dto.roomId.toString());
  
      // 방 전체에 퇴장 메시지 전송
      this.server.to(dto.roomId.toString()).emit('roomEvent', {
        msg: `${leaveUser.name} 님이 퇴장했습니다.`,
        roomUsers,
        roomUserCount,
      });

      // 클라이언트에 콜백 실행 값 리턴
      return { success: true };
    } catch (err) {
      console.error(err.message);
      client.disconnect();
      // 클라이언트에 콜백 실행 값 리턴
      return { success: false, error: err.message };
    }
  }

  // EventEmitter 이벤트(@OnEvent) 방식
  @OnEvent('leaveAllRooms')
  handleLeaveAllRooms(payload: { roomId: number, roomUserCount: number, roomUsers: any, deletedUser: any }) {
    const { roomId, roomUserCount, roomUsers, deletedUser } = payload;
    
    this.removeUserSocket(roomId, deletedUser.id);
    
    this.server.to(roomId.toString()).emit('roomEvent', {
      msg: `${deletedUser.name} 님이 퇴장했습니다.`,
      roomUsers,
      roomUserCount,
    });
  }

  @OnEvent('updateRoom')
  handleUpdateRoom(payload: { roomId: number, room: number }) {
    const { roomId, room } = payload;

    this.server.to(roomId.toString()).emit('roomUpdated', {
      msg: '방 정보가 변경되었습니다.',
      room,
    });
  }

  @OnEvent('deleteRoom')
  handleDeleteRoom(payload: { roomId: number, userId: number }) {
    const { roomId, userId } = payload;
    const userSocket = this.userSockets.get(userId);
    if (!userSocket) {
      console.log('소켓 아이디가 없습니다.');
      return;
    }
    const [socketId] = userSocket.keys();

    this.removeUserSocket(roomId, userId);

    // 특정 사용자에게만 메시지 전송
    this.server.to(socketId).emit('roomEvent', {
      msg: '방이 삭제되었습니다.',
      roomUsers: [],
      roomUserCount: 0,
    });
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    try {
      const dto = await this.validateDto(SendMessageDto, payload);
      const user = await this.getUserFromSession(client);
      const message = await this.messagesService.createMessage(dto.roomId, user.userId, dto.content, dto.type);
  
      this.server.to(dto.roomId.toString()).emit('messageCreated', message);
    } catch (err) {
      console.error(err.message);
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    try {
      const dto = await this.validateDto(DeleteMessageDto, payload);
      const user = await this.getUserFromSession(client);
      const messageId = await this.messagesService.deleteMessage(dto.roomId, user.userId, dto.messageId);
  
      this.server.to(dto.roomId.toString()).emit('messageDeleted', messageId);

      return { success: true };
    } catch (err) {
      console.error(err.message);
      return { success: false };
    }
  }

  @SubscribeMessage('kickUser')
  async handleKickUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    try {
      const dto = await this.validateDto(KickUserDto, payload);
      const owner = await this.getUserFromSession(client);

      const { roomUsers, roomUserCount, kickedUser } = await this.chatService.kickUser(dto.roomId, dto.userId, owner);

      this.removeUserSocket(dto.roomId, dto.userId);

      this.server.to(dto.roomId.toString()).emit('roomEvent', {
        msg: `${kickedUser.name} 님을 퇴장시켰습니다.`,
        roomUsers,
        roomUserCount,
      });
    } catch (err) {
      console.error(err.message);
    }
  }

  @SubscribeMessage('banUser')
  async handleBanUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    try {
      const dto = await this.validateDto(BanUserDto, payload);
      const owner = await this.getUserFromSession(client);

      await this.roomUsersService.banUserById(dto.roomId, dto.userId, owner, dto.banReason);

      const { roomUsers, roomUserCount, kickedUser } = await this.chatService.kickUser(dto.roomId, dto.userId, owner);

      this.removeUserSocket(dto.roomId, dto.userId);

      this.server.to(dto.roomId.toString()).emit('roomEvent', {
        msg: `${kickedUser.name} 님을 밴했습니다.`,
        roomUsers,
        roomUserCount,
      });
    } catch (err) {
      console.error(err.message);
    }
  }
}
