import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException
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
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.SERVER_URL,
    credentials: true,
  },
  transports: ['websocket'],
  pingInterval: 15000,
  pingTimeout: 5000,
})

export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SocketGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly socketService: SocketService,
    private readonly messagesService: MessagesService,
    private readonly roomUsersService: RoomUsersService,
    private readonly redisService: RedisService,
  ) {}
  
  async handleConnection(client: Socket) {
    try {
      const user = await this.getUserFromSession(client);
      client.data.userId = user.id;
      client.data.userName = user.name;
    } catch (err) {
      this.logger.warn(`[CONNECTION_ERROR] 소켓ID: ${client.id} | 사유: ${err.message}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId) {
      try {
        await this.redisService.delUserSocket(userId, client.id);
      } catch (err) {
        this.logger.error(`[DISCONNECT_ERROR] 유저ID:${userId} | 소켓ID:${client.id} | 사유:${err.message}`);
      }
    }
  }
  // 소켓 추가
  private async addUserSocket(userId: number, socketId: string, roomId: number) {
    await this.redisService.setUserSocket(userId, socketId, roomId);
  }

  // 강제 소켓 삭제 (강퇴/밴/로그아웃 등)
  private async removeUserSocket(roomId: number, userId: number) {
    // 1. Redis: 이 유저의 소켓 ID, 방 ID 필드 가져옴
    const socketMap = await this.redisService.getUserSockets(userId);

    for (const [sId, rId] of Object.entries(socketMap)) {
      if (Number(rId) === roomId) {
        // 2. Redis Adapter: 모든 프로세스에서 소켓 ID를 찾아 연결 끊기
        this.server.to(sId).emit('forcedDisconnect', { msg: "채팅방과 연결이 끊겼습니다." });
        this.server.in(sId).disconnectSockets(true);
        await this.redisService.delUserSocket(userId, sId);
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
  
    const userId = await this.redisService.getUserIdBySession(sessionId);
    if (!userId) throw new Error('세션 정보가 없습니다.');

    const userData = await this.redisService.getUserProfile(userId);
  
    return userData;
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
  async handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    try {
      const userId = client.data.userId; 
      if (!userId) throw new Error('인증되지 않은 사용자입니다.');

      const dto = await this.validateDto(JoinRoomDto, payload);
      const { roomId, password } = dto;

      const { roomUsers, afterCount, joinUser } = await this.socketService.joinRoom(roomId, userId, password);

      await this.removeUserSocket(roomId, userId);
      await this.addUserSocket(userId, client.id, roomId);
      client.join(roomId.toString());
  
      this.server.to(roomId.toString()).emit('roomEvent', {
        msg: `${joinUser.name} 님이 입장했습니다.`,
        roomUsers,
        roomUserCount: afterCount,
      });
    } catch (err) {
      this.logger.error(`[ROOM_JOIN_ERROR] 방ID:${payload?.roomId} | 유저ID:${client.data.userId || 'unknown'} | 사유:${err.message}`, err.stack);
      client.emit('forcedDisconnect', { msg: err.message });
      client.disconnect();
    }
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    try {
      const userId = client.data.userId;
      if (!userId) throw new Error('인증되지 않은 사용자입니다.');

      const dto = await this.validateDto(LeaveRoomDto, payload);
      const { roomUsers, roomUserCount, leaveUser } = await this.socketService.leaveRoom(dto.roomId, userId);

      client.leave(dto.roomId.toString());
  
      this.server.to(dto.roomId.toString()).emit('roomEvent', {
        msg: `${leaveUser.name} 님이 퇴장했습니다.`,
        roomUsers,
        roomUserCount,
      });

      return { success: true };
    } catch (err) {
      this.logger.error(`[ROOM_LEAVE_ERROR] 방ID:${payload?.roomId} | 유저ID:${client.data.userId} | 사유:${err.message}`);
      client.disconnect();
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
  async handleSendMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    try {
      const userId = client.data.userId;
      if (!userId) throw new Error('인증되지 않은 사용자입니다.');

      const dto = await this.validateDto(SendMessageDto, payload);
      
      const message = await this.messagesService.createMessage(dto.roomId, userId, dto.content, dto.type);
  
      this.server.to(dto.roomId.toString()).emit('messageCreate', message);
    } catch (err) {
      this.logger.error(`[MESSAGE_SEND_ERROR] 방ID:${payload?.roomId} | 유저ID:${client.data.userId} | 사유:${err.message}`);
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    try {
      const userId = client.data.userId;
      if (!userId) throw new Error('인증되지 않은 사용자입니다.');

      const dto = await this.validateDto(DeleteMessageDto, payload);
      const messageId = await this.messagesService.deleteMessage(dto.roomId, userId, dto.messageId);
  
      this.server.to(dto.roomId.toString()).emit('messageDeleted', messageId);
    } catch (err) {
      this.logger.error(`[MESSAGE_DELETE_ERROR] 방ID:${payload?.roomId} | 메시지ID:${payload?.messageId} | 유저ID:${client.data.userId} | 사유:${err.message}`);
      throw new WsException(err.message);
    }
  }

  @SubscribeMessage('request_sync')
  async handleSyncMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: number; lastMessageId: string } // string으로 변경
  ) {
    const { roomId, lastMessageId } = payload;
    if (!roomId || !lastMessageId) return;

    const missedMessages = await this.messagesService.getMissedMessages(roomId, lastMessageId);
    
    if (missedMessages.length > 0) {
      client.emit('sync_messages', {
        roomId,
        messages: missedMessages,
      });
    }
  }

  @SubscribeMessage('kickUser')
  async handleKickUser(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
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
      this.logger.error(`[ROOM_USER_KICK_ERROR] 방ID:${payload?.roomId} | 대상ID:${payload?.userId} | 사유:${err.message}`, err.stack);
      throw new WsException(err.message);
    }
  }

  @SubscribeMessage('banUser')
  async handleBanUser(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    try {
      const dto = await this.validateDto(BanUserDto, payload);
      const owner = await this.getUserFromSession(client);

      await this.roomUsersService.banUserById(dto.roomId, dto.userId, owner.id, dto.banReason);
      await this.removeUserSocket(dto.roomId, dto.userId);

      const [roomUsers, roomUserCount] = await Promise.all([
        this.socketService.getRoomUsersSummary(dto.roomId),
        this.redisService.getRoomUserCount(dto.roomId)
      ]);

      this.server.to(dto.roomId.toString()).emit('roomEvent', {
        msg: `사용자를 밴 처리했습니다.`,
        roomUsers,
        roomUserCount,
      });
    } catch (err) {
      this.logger.error(`[ROOM_USER_BAN_ERROR] 방ID:${payload?.roomId} | 대상ID:${payload?.userId} | 사유:${err.message}`, err.stack);
      throw new WsException(err.message);
    }
  }
}
