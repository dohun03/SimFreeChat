import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from 'src/redis/redis.service';
import { Like, Repository } from 'typeorm';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Room } from './rooms.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    private readonly redisService: RedisService
  ) {}

  // 방 생성
  async createRoom(sessionId: string, createRoomDto: CreateRoomDto): Promise<Omit<Room, 'password'> & { password: boolean }> {
    const { name, maxMembers, password } = createRoomDto;
    const session = await this.redisService.getSession(sessionId);
    if (!session) throw new UnauthorizedException('세션이 존재하지 않습니다.');
    
    let hashedPassword: string | null = null;
    if (password) hashedPassword = await bcrypt.hash(password, 10);

    const room = this.roomRepository.create({
      name, 
      owner: session.userId,
      maxMembers,
      password: hashedPassword,
    });
    const savedRoom = await this.roomRepository.save(room);

    return {
      ...savedRoom,
      password: !!savedRoom.password,
    };
  }

  // 방 수정
  async updateRoom(roomId: number, sessionId: string, updateRoomDto: UpdateRoomDto): Promise<Omit<Room, 'password'> & { password: boolean }> {
    const { name, maxMembers, password } = updateRoomDto;
    const session = await this.redisService.getSession(sessionId);
    if (!session) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    const room = await this.roomRepository.findOne({
      where: {
        id: roomId,
        owner: session.userId
      }
    });
    if (!room) throw new BadRequestException('방이 존재하지 않거나 권한이 없습니다.');

    if (name !== undefined) room.name = name;
    if (maxMembers !== undefined) room.maxMembers = maxMembers;
    if (password !== undefined) room.password = await bcrypt.hash(password, 10);

    const updatedRoom = await this.roomRepository.save(room);

    return {
      ...updatedRoom,
      password: !!updatedRoom.password,
    }
  }

  // 방 삭제
  async deleteRoom(roomId: number, sessionId: string): Promise<void> {
    const session = await this.redisService.getSession(sessionId);
    if (!session) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    await this.roomRepository.delete({
      id: roomId,
      owner: session.userId
    });
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
          password: !!room.password,
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

    const roomUserCount = await this.redisService.getRoomUserCount(roomId);
    
    return {
      id: room.id,
      name: room.name,
      currentMembers: roomUserCount,
      maxMembers: room.maxMembers,
      password: !!room.password,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      owner: {
        id: room.owner.id,
        username: room.owner.username,
      }
    }
  }
}
