import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/users.entity';
import { In, Repository } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { ChatEvents } from './chat.events';

@Injectable()
export class ChatService {
  constructor(
    private readonly redisService: RedisService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly chatEvents: ChatEvents,
  ) {}

  async joinRoom(roomId: number, userId: number) {
    const isUserInRoom = await this.redisService.isUserInRoom(roomId, userId);

    await this.redisService.addUserToRoom(roomId, userId);
    const roomUsersArray = await this.redisService.getRoomUsers(roomId);
    const roomUsers = await this.userRepository.find({
      where: { id: In(roomUsersArray.map(userId => Number(userId))) },
      select: ['id','username']
    });
    const roomUserCount = await this.redisService.getRoomUserCount(roomId);

    return { isUserInRoom: !!isUserInRoom, roomUsers, roomUserCount }
  }

  async leaveRoom(roomId: number, userId: number) {
    await this.redisService.removeUserFromRoom(roomId, userId);
    const roomUsersArray = await this.redisService.getRoomUsers(roomId);
    const roomUsers = await this.userRepository.find({
      where: { id: In(roomUsersArray.map(userId => Number(userId))) },
      select: ['id','username']
    });
    const roomUserCount = await this.redisService.getRoomUserCount(roomId);

    return { roomUsers, roomUserCount }
  }

  async leaveAllRooms(sessionId: string) {
    const session = await this.redisService.getSession(sessionId);
    if (!session) throw new UnauthorizedException('세션이 존재하지 않습니다.');
    
    const keys = await this.redisService.getAllRooms();
    console.log("sessions:",session);

    await Promise.all(
      keys.map(async (key) => {
        const roomId = Number(key.split(':')[1]);
        const roomUserCount = await this.redisService.getRoomUserCount(roomId);
        await this.redisService.removeUserFromRoom(roomId, session.userId);
        this.chatEvents.leaveAllRooms(roomId, roomUserCount, session);
      })
    );
  }

  async listRoomUsers(roomId: number) {
    return await this.redisService.getRoomUsers(roomId);
  }
}
