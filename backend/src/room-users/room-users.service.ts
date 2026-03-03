import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from 'src/redis/redis.service';
import { Room } from 'src/rooms/rooms.entity';
import { Repository } from 'typeorm';
import { RoomUser } from './room-user.entity';

@Injectable()
export class RoomUsersService {
  private readonly logger = new Logger(RoomUsersService.name);
  constructor(
    private readonly redisService: RedisService,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(RoomUser)
    private readonly roomUserRepository: Repository<RoomUser>,
  ) {}

  async banUserById(roomId: number, targetUserId: number, ownerId: number, banReason: string): Promise<void> {
    const [room, roomUser] = await Promise.all([
      this.roomRepository.findOne({
        where: { id: roomId },
        relations: ['owner'],
      }),
      this.roomUserRepository.findOne({
        where: { room: { id: roomId }, user: { id: targetUserId } },
      }),
    ]);

    // 권한 및 상태 체크
    if (!room || room.owner.id !== ownerId) throw new ForbiddenException('방장 권한이 없습니다.');
    if (room.owner.id === targetUserId) throw new BadRequestException('방장을 밴 처리할 수 없습니다.');
    if (roomUser?.isBanned) throw new BadRequestException('이미 밴 상태인 유저입니다.');
    
    // 작업 시작
    await this.roomUserRepository.manager.transaction(async (transaction) => {
      try {
        const targetUser = roomUser || this.roomUserRepository.create({
          room: { id: roomId },
          user: { id: targetUserId },
        });
        targetUser.isBanned = true;
        targetUser.banReason = banReason;

        await transaction.save(targetUser);
        await this.redisService.delUserRoomRelation(roomId, targetUserId);
        
        this.logger.log(`[ROOM_USER_BAN_SUCCESS] 방ID:${roomId} | 대상ID:${targetUserId}`);

      } catch (err) {
        this.logger.error(`[ROOM_USER_BAN_ERROR] 방ID:${roomId} | 대상ID:${targetUserId} | 사유:${err.message}`, err.stack);
        throw new InternalServerErrorException('밴 처리 중 오류가 발생했습니다.');
      }
    });
  }

  async unBanUserById(roomId: number, targetUserId: number, ownerId: number): Promise<boolean> {
    const room = await this.roomRepository.findOne({
      where: {
        id: roomId,
        owner: { id: ownerId },
      },
    });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다.');

    const result = await this.roomUserRepository.delete({
      room: { id: roomId },
      user: { id: targetUserId },
      isBanned: true,
    });
    if (result.affected === 0) throw new BadRequestException('해당 유저가 존재하지 않습니다.');

    this.logger.log(`[ROOM_USER_UNBAN_SUCCESS] 방ID:${roomId} | 방장ID:${ownerId} | 대상ID:${targetUserId}`);

    return true;
  }

  getBannedUsersByRoomId(roomId: number): Promise<RoomUser[]> {
    return this.roomUserRepository
    .createQueryBuilder('roomUser')
    .leftJoinAndSelect('roomUser.user', 'user')
    .where('roomUser.room = :roomId', { roomId })
    .andWhere('roomUser.isBanned = true')
    .select([
      'roomUser.id',
      'roomUser.isBanned',
      'roomUser.banReason',
      'roomUser.createdAt',
      'user.id',
      'user.name'
    ])
    .getMany();
  }
}
