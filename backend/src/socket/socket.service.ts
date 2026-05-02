import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Room } from 'src/rooms/entities/rooms.entity';
import { User } from 'src/users/entities/users.entity';
import { In, Repository } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { SocketEvents } from './socket.events';
import * as bcrypt from 'bcrypt';
import { RoomUser, RoomUserRole, RoomUserStatus } from 'src/room-users/entities/room-users.entity';
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

  async joinRoom(roomId: number, userId: number, password?: string): Promise<JoinRoomResult> {
    // 1. 방 존재 여부 확인
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ['owner'],
    });
    if (!room) throw new BadRequestException('존재하지 않는 방입니다.');

    // 2. 인원 제한 체크 (Redis)
    const beforeCount = await this.redisService.getRoomUserCount(roomId);
    if (beforeCount>=room.maxMembers) throw new BadRequestException('방의 인원이 가득 찼습니다.');
    
    const joinUser = await this.redisService.getUserProfile(userId);
    if (!joinUser) throw new UnauthorizedException('사용자가 존재하지 않습니다.');
    if (joinUser.bannedUntil && joinUser.bannedUntil > new Date()) throw new UnauthorizedException(`이용이 정지된 계정입니다. 사유:  ${joinUser.banReason}`);

    // 3. 비밀번호 체크 (관리자, 방장 제외)
    const isOwner = room.owner.id === userId;
    const isAdmin = joinUser.isAdmin;

    if (room.password && !isOwner && !isAdmin) {
      const isPasswordValid = password ? await bcrypt.compare(password, room.password) : false;
      if (!isPasswordValid) throw new BadRequestException('비밀번호가 일치하지 않습니다.');
    }

    // 4. DB에서 방별 유저 상태/권한 조회
    let roomUser = await this.roomUserRepository.findOne({
      where: { room: { id: roomId }, user: { id: userId } },
    });

    const now = new Date();

    // 5. 밴 여부 체크
    if (roomUser) {
      if (roomUser.status === RoomUserStatus.BANNED) {
        if (roomUser.restrictedUntil && roomUser.restrictedUntil > now) {
          const isPermanent = roomUser.restrictedUntil.getFullYear() === 9999;
          const msg = isPermanent ? '영구 제한' : `${roomUser.restrictedUntil.toLocaleString()}까지 제한`;
          
          throw new ForbiddenException(`이 방에서 밴 처리된 사용자입니다. 사유: ${roomUser.banReason} (${msg})`);
        }

        roomUser.status = RoomUserStatus.NORMAL;
        roomUser.restrictedUntil = null;
        await this.roomUserRepository.save(roomUser);
      }
    } else {
      // 6. 방에 처음 입장시 DB 생성
      const isOwner = room.owner.id === userId;
      roomUser = this.roomUserRepository.create({
        room: { id: roomId },
        user: { id: userId },
        role: isOwner ? RoomUserRole.OWNER : RoomUserRole.MEMBER,
        status: RoomUserStatus.NORMAL,
      });
      await this.roomUserRepository.save(roomUser);
    }
    
    // 7. Redis 실시간 접속 정보 반영
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

        this.socketEvents.leaveAllRooms({
          roomId, 
          roomUserCount, 
          roomUsers, 
          deletedUser: leaveUser
        });
      }
    }

    await this.redisService.delSessionByUserId(userId);

    this.logger.log(`ROOM_LEAVE_ALL [SUCCESS] 유저ID:${userId}`);
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
