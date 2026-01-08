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
import { SocketService as SocketService } from './socket.service';
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
  transport: ['websocket'],
  pingInterval: 60000 * 1,  // 1분마다 ping
  pingTimeout: 60000 * 2,   // 2분 동안 pong 없으면 연결 끊음
})

export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly socketService: SocketService,
    private readonly messagesService: MessagesService,
    private readonly roomUsersService: RoomUsersService,
    private readonly redisService: RedisService,
  ) {}
  
  handleConnection(client: Socket) {
    console.log(`[CONNECT] ${client.id} - ${client.handshake.address}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`[DISCONNECT] ${client.id}`);

    const userId = client.data.userId;
    if (userId) {
      console.log(`[DISCONNECT] 유저 ${userId}의 소켓 ${client.id} 정리 중...`);
      await this.redisService.hDelUserSocket(userId, client.id);
    }
  }

  // 소켓 추가
  async addUserSocket(userId: number, socketId: string, roomId: number) {
    await this.redisService.hSetUserSocket(userId, socketId, roomId);
  }

  // 강제 소켓 삭제 (강퇴/밴/로그아웃 등)
  async removeUserSocket(roomId: number, userId: number) {
    // 1. Redis: 이 유저의 소켓 ID, 방 ID 필드 가져옴
    const socketMap = await this.redisService.hGetAllUserSockets(userId);

    for (const [sId, rId] of Object.entries(socketMap)) {
      if (Number(rId) === roomId) {
        // 2. Redis Adapter: 모든 프로세스에서 소켓 ID를 찾아 연결 끊기
        this.server.to(sId).emit('forcedDisconnect', { msg: "채팅방과 연결이 끊겼습니다." });
        this.server.in(sId).disconnectSockets(true);
        await this.redisService.hDelUserSocket(userId, sId);
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
  
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    try {
      const dto = await this.validateDto(JoinRoomDto, payload);
      const user = await this.getUserFromSession(client);
      client.data.userId = user.userId;

      const { roomId, password } = dto;
      const { roomUsers, afterCount, joinUser } = await this.socketService.joinRoom(roomId, user.userId, password);

      // 방 입장 로직
      await this.removeUserSocket(roomId, user.userId);
      await this.addUserSocket(user.userId, client.id, roomId);
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
      const { roomUsers, roomUserCount, leaveUser } = await this.socketService.leaveRoom(dto.roomId, user.userId);

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

  @OnEvent('leaveAllRooms')
  async handleLeaveAllRooms(payload: { userId: number, roomId: number, roomUserCount: number, roomUsers: any, deletedUser: any }) {
    const { userId, roomId, roomUserCount, roomUsers, deletedUser } = payload;
    
    await this.removeUserSocket(roomId, deletedUser.id);
    
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
    this.removeUserSocket(roomId, userId);
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
  
      this.server.to(dto.roomId.toString()).emit('messageCreate', message);
    } catch (err) {
      console.error(err);
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

      const { roomUsers, roomUserCount, kickedUser } = await this.socketService.kickUser(dto.roomId, dto.userId, owner);

      await this.removeUserSocket(dto.roomId, dto.userId);

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

      const { roomUsers, roomUserCount, kickedUser } = await this.socketService.kickUser(dto.roomId, dto.userId, owner);

      await this.removeUserSocket(dto.roomId, dto.userId);

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
