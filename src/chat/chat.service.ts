import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Room } from 'src/rooms/rooms.entity';
import { User } from 'src/users/users.entity';
import { In, Repository } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { ChatEvents } from './chat.events';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ChatService {
  constructor(
    private readonly redisService: RedisService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    private readonly chatEvents: ChatEvents,
  ) {}

  async joinRoom(roomId: number, userId: number, password: string) {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) throw new BadRequestException('존재하지 않는 방입니다.');

    const beforeCount = await this.redisService.getRoomUserCount(roomId);
    if (beforeCount>=room.maxMembers) throw new BadRequestException('방의 인원이 가득 찼습니다.');
    
    if (room.password && room.owner.id!=userId) {
      const isPasswordValid = await bcrypt.compare(password, room.password);
      if (!isPasswordValid) throw new BadRequestException('비밀번호가 일치하지 않습니다.');
    }
    
    const joinUser = await this.userRepository.findOne({
      where: { id: userId }
    });
    if (!joinUser) throw new UnauthorizedException('사용자가 존재하지 않습니다.');
    
    await this.redisService.addUserToRoom(roomId, userId);

    const afterCount = await this.redisService.getRoomUserCount(roomId);
    const roomUsersArray = await this.redisService.getRoomUsers(roomId);
    const roomUsers = await this.userRepository.find({
      where: { id: In(roomUsersArray.map(userId => Number(userId))) },
      select: ['id','name']
    });

    return { roomUsers, afterCount, joinUser };
  }

  async leaveRoom(roomId: number, userId: number) {
    const isUserInRoom = await this.redisService.isUserInRoom(roomId, userId);
    if (!isUserInRoom) throw new BadRequestException('방에 존재하지 않습니다.');

    const leaveUser = await this.userRepository.findOne({
      where: { id: userId }
    });
    if (!leaveUser) throw new UnauthorizedException('사용자가 존재하지 않습니다.');

    await this.redisService.removeUserFromRoom(roomId, userId);

    const roomUsersArray = await this.redisService.getRoomUsers(roomId);
    const roomUsers = await this.userRepository.find({
      where: { id: In(roomUsersArray.map(userId => Number(userId))) },
      select: ['id','name']
    });
    const roomUserCount = await this.redisService.getRoomUserCount(roomId);

    return { roomUsers, roomUserCount, leaveUser };
  }

  async leaveAllRooms(userId: number) {
    const leaveUser = await this.userRepository.findOne({
      where: { id: userId }
    });
    if (!leaveUser) throw new UnauthorizedException('사용자가 존재하지 않습니다.');

    const roomKeys = await this.redisService.getAllRoomKeys();

    await Promise.all(
      roomKeys.map(async (key) => {
        const roomId = Number(key.split(':')[1]);
        const isUserInRoom = await this.redisService.isUserInRoom(roomId, userId);
        if (!isUserInRoom) {
          console.log(`${roomId}번 방에는 ${leaveUser.name}님이 존재하지 않습니다.`);
          return;
        }
        console.log(`${roomId}번 방에서 ${leaveUser.name}님을 내보냈습니다.`);
        await this.redisService.removeUserFromRoom(roomId, userId);
        const roomUsersArray = await this.redisService.getRoomUsers(roomId);
        const roomUsers = await this.userRepository.find({
          where: { id: In(roomUsersArray.map(userId => Number(userId))) },
          select: ['id','name']
        });
        const roomUserCount = await this.redisService.getRoomUserCount(roomId);

        this.chatEvents.leaveAllRooms(roomId, roomUserCount, roomUsers, leaveUser);
      })
    );
  }

  updateRoom(roomId: number, room: any) {
    this.chatEvents.updateRoom(roomId, room);
  }

  async deleteRoom(roomId: number) {
    const roomUsersArray = await this.redisService.getRoomUsers(roomId);
    await this.redisService.deleteRoom(roomId);
    await Promise.all(
      roomUsersArray.map(userId => {
        this.chatEvents.deleteRoom(roomId, Number(userId));
      })
    );
  }

  async kickUser(roomId: number, userId: number, owner: any) {
    const isUserInRoom = await this.redisService.isUserInRoom(roomId, userId);
    if (!isUserInRoom) throw new BadRequestException('방에 존재하지 않습니다.');

    const isOwner = await this.roomRepository.findOne({
      where: {
        id: roomId,
        owner: owner.userId
      }
    });
    if (!isOwner) throw new UnauthorizedException('권한이 없습니다');

    await this.redisService.removeUserFromRoom(roomId, userId);

    const kickedUser = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'name']
    });
    if (!kickedUser) throw new BadRequestException('해당 유저가 없습니다.');
    
    const roomUsersArray = await this.redisService.getRoomUsers(roomId);
    const roomUsers = await this.userRepository.find({
      where: { id: In(roomUsersArray.map(userId => Number(userId))) },
      select: ['id','name']
    });
    const roomUserCount = await this.redisService.getRoomUserCount(roomId);

    return { roomUsers, roomUserCount, kickedUser };
  }

  async listRoomUsers(roomId: number) {
    return await this.redisService.getRoomUsers(roomId);
  }
}
