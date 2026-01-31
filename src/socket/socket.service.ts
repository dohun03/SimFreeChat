import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Room } from 'src/rooms/rooms.entity';
import { User } from 'src/users/users.entity';
import { In, Repository } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { SocketEvents } from './socket.events';
import * as bcrypt from 'bcrypt';
import { RoomUser } from 'src/room-users/room-user.entity';
import { JoinRoomResult, KickUserResult, LeaveRoomResult } from './types/socket.types';

@Injectable()
export class SocketService {
  private readonly logger = new Logger(SocketService.name);

  constructor(
    private readonly redisService: RedisService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(RoomUser)
    private readonly roomUserRepository: Repository<RoomUser>,
    private readonly socketEvents: SocketEvents,
  ) {}

  private async getRoomUsersSummary(roomId: number) {
    const roomUsersArray = await this.redisService.getRoomUsers(roomId);
    return await this.userRepository.find({
      where: { id: In(roomUsersArray.map(id => Number(id))) },
      select: ['id', 'name']
    });
  }

  async joinRoom(roomId: number, userId: number, password?: string): Promise<JoinRoomResult> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ['owner'],
    });
    if (!room) throw new BadRequestException('존재하지 않는 방입니다.');

    const beforeCount = await this.redisService.getRoomUserCount(roomId);
    if (beforeCount>=room.maxMembers) throw new BadRequestException('방의 인원이 가득 찼습니다.');
    
    if (room.password && room.owner.id!=userId) {
      const isPasswordValid = password ? await bcrypt.compare(password, room.password) : false;
      if (!isPasswordValid) throw new BadRequestException('비밀번호가 일치하지 않습니다.');
    }
    
    const joinUser = await this.userRepository.findOne({
      where: { id: userId }
    });
    if (!joinUser) throw new UnauthorizedException('사용자가 존재하지 않습니다.');
    if (joinUser.bannedUntil && joinUser.bannedUntil > new Date()) throw new UnauthorizedException(`이용이 정지된 계정입니다. 사유:  ${joinUser.banReason}`);

    const bannedUser = await this.roomUserRepository.findOne({
      where: {
        room: { id: roomId },
        user: { id: userId },
      },
    });
    if (bannedUser?.isBanned) throw new BadRequestException(`이 방에서 밴 처리된 사용자입니다: ${bannedUser.banReason}`);
    
    await this.redisService.addUserToRoom(roomId, userId);

    const afterCount = await this.redisService.getRoomUserCount(roomId);
    const roomUsers = await this.getRoomUsersSummary(roomId);

    return { roomUsers, afterCount, joinUser };
  }

  async leaveRoom(roomId: number, userId: number): Promise<LeaveRoomResult> {
    const isUserInRoom = await this.redisService.isUserInRoom(roomId, userId);
    if (!isUserInRoom) throw new BadRequestException('방에 존재하지 않습니다.');

    const leaveUser = await this.userRepository.findOne({
      where: { id: userId }
    });
    if (!leaveUser) throw new UnauthorizedException('사용자가 존재하지 않습니다.');

    await this.redisService.removeUserFromRoom(roomId, userId);

    const roomUsers = await this.getRoomUsersSummary(roomId);
    const roomUserCount = await this.redisService.getRoomUserCount(roomId);

    return { roomUsers, roomUserCount, leaveUser };
  }

  async leaveAllRooms(userId: number): Promise<void> {
    const leaveUser = await this.userRepository.findOne({
      where: { id: userId }
    });
    if (!leaveUser) throw new UnauthorizedException('사용자가 존재하지 않습니다.');

    const roomKeys = await this.redisService.getAllRoomKeys();

    await Promise.all(
      roomKeys.map(async (key) => {
        const roomId = Number(key.split(':')[2]);
        const isUserInRoom = await this.redisService.isUserInRoom(roomId, userId);
        if (!isUserInRoom) {
          this.logger.log(`${roomId}번 방에는 ${leaveUser.name}님이 존재하지 않습니다.`);
          return;
        }

        await this.redisService.removeUserFromRoom(roomId, userId);
        
        const roomUsers = await this.getRoomUsersSummary(roomId);
        const roomUserCount = await this.redisService.getRoomUserCount(roomId);

        this.socketEvents.leaveAllRooms(roomId, roomUserCount, roomUsers, leaveUser);

        this.logger.log(`${roomId}번 방에서 ${leaveUser.name}님을 내보냈습니다.`);
      })
    );
  }

  async updateRoom(roomId: number, room: any): Promise<void> {
    this.socketEvents.updateRoom(roomId, room);
  }

  async kickUser(roomId: number, userId: number, owner: any): Promise<KickUserResult> {
    const isUserInRoom = await this.redisService.isUserInRoom(roomId, userId);
    if (!isUserInRoom) throw new BadRequestException('방에 존재하지 않습니다.');

    const room = await this.roomRepository.findOne({
      where: {
        id: roomId,
        owner: owner.userId
      },
      relations: ['owner'],
    });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다.');
    if (room.owner.id!==owner.userId) throw new UnauthorizedException('권한이 없습니다.');
    if (room.owner.id === userId) throw new BadRequestException('방장을 밴 처리할 수 없습니다.');

    await this.redisService.removeUserFromRoom(roomId, userId);

    const kickedUser = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'name']
    });
    if (!kickedUser) throw new BadRequestException('해당 유저가 없습니다.');
    
    const roomUsers = await this.getRoomUsersSummary(roomId);
    const roomUserCount = await this.redisService.getRoomUserCount(roomId);

    return { roomUsers, roomUserCount, kickedUser };
  }

  async listRoomUsers(roomId: number): Promise<string[]> {
    return await this.redisService.getRoomUsers(roomId);
  }
}
