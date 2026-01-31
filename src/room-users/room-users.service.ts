import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
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

  async banUserById(roomId: number, userId: number, owner: any, banReason: string): Promise<void> {
    const room = await this.roomRepository.findOne({
      where: {
        id: roomId,
        owner: { id: owner.userId }
      },
      relations: ['owner'],
    });
    if (!room) throw new UnauthorizedException('방장만 수행할 수 있습니다.');
    if (room.owner.id === userId) throw new BadRequestException('방장을 밴 처리할 수 없습니다.');

    let roomUser = await this.roomUserRepository.findOne({
      where: {
        room: { id: roomId },
        user: { id: userId },
      },
    });
    if (roomUser?.isBanned) throw new BadRequestException('해당 유저는 이미 밴 상태입니다.');

    // 밴 로직
    const bannedUser = this.roomUserRepository.create({
      room: { id: roomId },
      user: { id: userId },
      isBanned: true,
      banReason
    });
    await this.roomUserRepository.save(bannedUser);

    this.logger.log(`밴 완료: Room(${roomId}): Owner(${owner.userId})가 User(${userId})를 밴함. 사유: ${banReason}`);
  }

  async unBanUserById(roomId: number, userId: number, ownerId: number): Promise<boolean> {
    const room = await this.roomRepository.findOne({
      where: {
        id: roomId,
        owner: { id: ownerId },
      },
    });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다.');

    try {
      const result = await this.roomUserRepository.delete({
        room: { id: roomId },
        user: { id: userId }
      });
      
      if (result.affected === 0) throw new BadRequestException('해당 유저가 존재하지 않습니다.');

      this.logger.log(`밴 해제 완료: Room(${roomId}): Owner(${ownerId})가 User(${userId})의 밴을 해제함.`);

      return true;
    } catch (err) {
      this.logger.error(`밴 해제 중 에러 발생: Room(${roomId}) User(${userId})`, err.stack);
      throw new InternalServerErrorException('밴 해제 처리 중 오류가 발생했습니다.');
    }
  }

  getBannedUsersById(roomId: number): Promise<RoomUser[]> {
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
