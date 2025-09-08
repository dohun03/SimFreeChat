import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from 'src/redis/redis.service';
import { Like, Repository } from 'typeorm';
import { CreateRoomDto } from './dto/create-room.dto';
import { Room } from './rooms.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    private readonly redisService: RedisService
  ) {}

  // 방 생성
  async createRoom(sessionID: string, createRoomDto: CreateRoomDto): Promise<Room> {
    const { name, maxMembers, isPrivate, password } = createRoomDto;
    const session = await this.redisService.getSession(sessionID);

    if (!session) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    const room = this.roomRepository.create({
      name, 
      owner: session.userId,
      maxMembers, 
      isPrivate, 
      password
    });

    return await this.roomRepository.save(room);
  }

  // 방 전체 조회
  async getAllRooms(search: any) {
    const where: any = { isPrivate: false }

    if (search) {
      where.name = Like(`%${search}%`);
    }

    const rooms = await this.roomRepository.find({ where: where });

    return rooms.map(room => ({
      id: room.id,
      name: room.name,
      maxMembers: room.maxMembers,
      isPrivate: room.isPrivate,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      owner: {
        id: room.owner.id,
        username: room.owner.username,
      }
    }));
  }
}
