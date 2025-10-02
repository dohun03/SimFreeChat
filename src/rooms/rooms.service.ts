import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
  async createRoom(sessionId: string, createRoomDto: CreateRoomDto): Promise<Room> {
    const { name, maxMembers, password } = createRoomDto;
    const session = await this.redisService.getSession(sessionId);
    if (!session) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    const room = this.roomRepository.create({
      name, 
      owner: session.userId,
      maxMembers,
      password,
    });

    return await this.roomRepository.save(room);
  }

  // 방 전체 조회
  async getAllRooms(search: any) {
    const where: any = new Object();

    if (search) {
      where.name = Like(`%${search}%`);
    }

    const rooms = await this.roomRepository.find({ where: where });
    return await Promise.all(
      rooms.map(async room => {
        const roomUserCount = await this.redisService.getRoomUserCount(room.id);
        return {
          id: room.id,
          name: room.name,
          currentMembers: roomUserCount,
          maxMembers: room.maxMembers,
          password: room.password ? true : false,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
          owner: {
            id: room.owner.id,
            username: room.owner.username,
          }
        }
      })
    );
  }

  // 방 하나 조회
  async getRoom(sessionId: string, roomId: number) {
    const session = await this.redisService.getSession(sessionId);
    if (!session) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('존재하지 않는 방입니다.');
    
    return room;
  }
}
