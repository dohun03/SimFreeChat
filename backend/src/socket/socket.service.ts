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

  async getRoomUsersSummary(roomId: number) {
    const roomUsersArray = await this.redisService.getRoomUsers(roomId);
    if (roomUsersArray.length === 0) return [];

    const users = await Promise.all(
      roomUsersArray.map(userId => 
        this.redisService.getUserProfile(Number(userId))
      )
    );

    return users.filter(user => !!user);
  }

  // room 정보도 추후에 Redis로 저장
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
    
    const joinUser = await this.redisService.getUserProfile(userId);
    if (!joinUser) throw new UnauthorizedException('사용자가 존재하지 않습니다.');
    if (joinUser.bannedUntil && joinUser.bannedUntil > new Date()) throw new UnauthorizedException(`이용이 정지된 계정입니다. 사유:  ${joinUser.banReason}`);

    const bannedUser = await this.roomUserRepository.findOne({
      where: {
        room: { id: roomId },
        user: { id: userId },
      },
    });
    if (bannedUser?.isBanned) throw new BadRequestException(`이 방에서 밴 처리된 사용자입니다: ${bannedUser.banReason}`);
    
    await this.redisService.addRoomUser(roomId, userId);
    await this.redisService.addUserRoom(userId, roomId);

    const afterCount = await this.redisService.getRoomUserCount(roomId);
    const roomUsers = await this.getRoomUsersSummary(roomId);

    return { roomUsers, afterCount, joinUser };
  }

  async leaveRoom(roomId: number, userId: number): Promise<LeaveRoomResult> {
    const isUserInRoom = await this.redisService.isUserInRoom(roomId, userId);
    if (!isUserInRoom) throw new BadRequestException('방에 존재하지 않습니다.');

    const leaveUser = await this.redisService.getUserProfile(userId);
    if (!leaveUser) throw new UnauthorizedException('사용자가 존재하지 않습니다.');

    await this.redisService.delUserRoomRelation(roomId, userId);

    const roomUsers = await this.getRoomUsersSummary(roomId);
    const roomUserCount = await this.redisService.getRoomUserCount(roomId);

    return { roomUsers, roomUserCount, leaveUser };
  }

  async leaveAllRooms(userId: number): Promise<void> {
    let leaveUser = await this.redisService.getUserProfile(userId);
    if (!leaveUser) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (user) {
            const { password, ...safeUser } = user;
            leaveUser = safeUser;
        }
    }
    
    // 만약 진짜 없는 유저면 중단
    if (!leaveUser) {
      this.logger.warn(`[LEAVE_ALL_ROOMS_SKIP] 유저ID:${userId} - 정리할 유저 정보가 존재하지 않음`);
      return;
    }

    const userRoomIds = await this.redisService.getUserRooms(userId);

    if (userRoomIds && userRoomIds.length > 0) {
      for (const roomIdStr of userRoomIds) {
        const roomId = Number(roomIdStr);
        await this.redisService.delUserRoomRelation(roomId, userId);

        const [roomUsers, roomUserCount] = await Promise.all([
          this.getRoomUsersSummary(roomId),
          this.redisService.getRoomUserCount(roomId)
        ]);

        this.socketEvents.leaveAllRooms(roomId, roomUserCount, roomUsers, leaveUser);
      }
    }

    await this.redisService.delSessionByUserId(userId);

    this.logger.log(`ROOM_LEAVE_ALL [SUCCESS] 유저ID:${userId}`);
  }

  async updateRoom(roomId: number, room: any): Promise<void> {
    this.socketEvents.updateRoom(roomId, room);
  }

  async kickUser(roomId: number, targetUserId: number, owner: any): Promise<KickUserResult> {
    const isUserInRoom = await this.redisService.isUserInRoom(roomId, targetUserId);
    if (!isUserInRoom) throw new BadRequestException('방에 존재하지 않습니다.');

    const room = await this.roomRepository.findOne({
      where: {
        id: roomId,
        owner: owner.id
      },
      relations: ['owner'],
    });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다.');
    if (room.owner.id!==owner.id) throw new UnauthorizedException('권한이 없습니다.');
    if (room.owner.id === targetUserId) throw new BadRequestException('방장을 밴 처리할 수 없습니다.');

    await this.redisService.delUserRoomRelation(roomId, targetUserId);

    const kickedUser = await this.redisService.getUserProfile(targetUserId);
    if (!kickedUser) throw new BadRequestException('해당 유저가 없습니다.');
    
    const roomUsers = await this.getRoomUsersSummary(roomId);
    const roomUserCount = await this.redisService.getRoomUserCount(roomId);

    return { roomUsers, roomUserCount, kickedUser };
  }
}
