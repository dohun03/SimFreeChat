import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from 'src/redis/redis.service';
import { Room } from 'src/rooms/rooms.entity';
import { Repository } from 'typeorm';
import { CreateRoomUserDto } from './dto/create-room-user.dto';
import { UpdateRoomUserDto } from './dto/update-room-user.dto';
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

  async banUser(roomId: number, userId: number, owner: any, banReason: string): Promise<void> {
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
