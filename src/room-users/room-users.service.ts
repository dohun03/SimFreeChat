import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from 'src/redis/redis.service';
import { Room } from 'src/rooms/rooms.entity';
import { Repository } from 'typeorm';
import { RoomUser } from './room-user.entity';

@Injectable()
export class RoomUsersService {
  constructor(
    private readonly redisService: RedisService,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(RoomUser)
    private readonly roomUserRepository: Repository<RoomUser>,
  ) {}

  async banUserById(roomId: number, userId: number, owner: any, banReason: string): Promise<void> {
    // 유효성 체크
    const isUserInRoom = await this.redisService.isUserInRoom(roomId, userId);
    if (!isUserInRoom) throw new BadRequestException('방에 존재하지 않습니다.');

    const room = await this.roomRepository.findOne({
      where: {
        id: roomId,
        owner: owner.userId
      }
    });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다.');
    if (room.owner.id!==owner.userId) throw new UnauthorizedException('권한이 없습니다.');
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
  }

  async unBanUserById(roomId: number, userId: number, sessionId: string): Promise<void> {
    const session = await this.redisService.getSession(sessionId);
    if (!session) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    const room = await this.roomRepository.findOne({
      where: {
        id: roomId,
        owner: session.userId
      }
    });
    if (!room) throw new NotFoundException('방을 찾을 수 없습니다.');

    try {
      const result = await this.roomUserRepository.delete({
        room: { id: roomId },
        user: { id: userId }
      });
      
      if (result.affected === 0) throw new BadRequestException('해당 유저가 존재하지 않습니다.');
    } catch (err) {
      console.error('밴 해제 중 DB 삭제 에러:', err);
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
