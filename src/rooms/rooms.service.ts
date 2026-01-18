import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from 'src/redis/redis.service';
import { Like, Repository } from 'typeorm';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Room } from './rooms.entity';
import * as bcrypt from 'bcrypt';
import { RoomResponseDto } from './dto/response-room.dto';
import { User } from 'src/users/users.entity';
import { SocketEvents } from 'src/socket/socket.events';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly redisService: RedisService,
    private readonly socketEvents: SocketEvents,
  ) {}

  // 방 생성
  async createRoom(userId: number, createRoomDto: CreateRoomDto): Promise<Omit<Room, 'password'> & { password: boolean }> {
    const { name, maxMembers, password } = createRoomDto;

    const owner = await this.userRepository.findOne({
      where: { id: userId }
    });
    if (!owner) throw new NotFoundException('유저를 찾을 수 없습니다.');

    let hashedPassword: string | null = null;
    if (password) hashedPassword = await bcrypt.hash(password, 10);

    const room = this.roomRepository.create({
      name, 
      owner,
      maxMembers,
      password: hashedPassword,
    });
    try {
      const savedRoom = await this.roomRepository.save(room);
      return {
        ...savedRoom,
        password: !!savedRoom.password,
      };
    } catch (err) {
      console.error('DB 저장 에러:', err);
      throw new InternalServerErrorException('방 생성 중 문제가 발생했습니다.');
    }
  }

  // 방 수정
  async updateRoom(roomId: number, userId: number, updateRoomDto: UpdateRoomDto): Promise<Omit<Room, 'password'> & { password: boolean }> {
    const { name, maxMembers, password } = updateRoomDto;

    const room = await this.roomRepository.findOne({
      where: {
        id: roomId,
        owner: { id: userId }
      }
    });
    if (!room) throw new BadRequestException('방이 존재하지 않거나 권한이 없습니다.');
    
    try {
      if (name !== undefined) room.name = name;
      if (maxMembers !== undefined) room.maxMembers = maxMembers;
      if (password !== undefined) room.password = password === null ? null : await bcrypt.hash(password, 10);
  
      const updatedRoom = await this.roomRepository.save(room);
  
      return {
        ...updatedRoom,
        password: !!updatedRoom.password,
      }
    } catch (err) {
      console.error('DB 저장 에러:', err);
      throw new InternalServerErrorException('방 수정 중 문제가 발생했습니다.');
    }
  }

  // 방 삭제
  async deleteRoom(roomId: number, userId: number): Promise<void> {
    try {
      const result = await this.roomRepository.delete({
        id: roomId,
        owner: { id: userId }
      });
      if (result.affected === 0) throw new BadRequestException('방이 존재하지 않거나 권한이 없습니다.');


      const roomUsersArray = await this.redisService.getRoomUsers(roomId);

      await this.redisService.deleteRoom(roomId);
      await this.redisService.deleteAllBufferMessagesByRoom(roomId);
      await this.redisService.deleteAllCacheMessagesByRoom(roomId);

      await Promise.all(
        roomUsersArray.map(userId => {
          this.socketEvents.deleteRoom(roomId, Number(userId));
        })
      );
    } catch (err) {
      console.error('DB 삭제 에러:', err);
      throw new InternalServerErrorException('방 삭제 중 문제가 발생했습니다.');
    }
  }

  // 방 전체 유저 조회
  async getRoomTotalUserCount(): Promise<number> {
    return this.redisService.getRoomTotalUserCount();
  }

  // 방 전체 조회
  async getAllRooms(sort: string = 'popular_desc', search?: string): Promise<RoomResponseDto[]> {
    console.log(sort);
    try {
      const where: any = {};

      if (search) {
        where.name = Like(`%${search}%`);
      }

      const rooms = await this.roomRepository.find({
        where,
        relations: ['owner'],
        select: {
          id: true,
          name: true,
          maxMembers: true,
          password: true,
          createdAt: true,
          updatedAt: true,
          owner: {
            id: true,
            name: true,
          }
        }
      });
      if (rooms.length === 0) return [];

      // Redis에서 실시간 인원수 병렬 로드
      const countsMap = await this.redisService.getRoomUserCountsBulk(rooms.map(r => r.id));

      // DTO 매핑
      const mappedRooms: RoomResponseDto[] = rooms.map(room => ({
        id: room.id,
        name: room.name,
        currentMembers: countsMap[room.id] || 0,
        maxMembers: room.maxMembers,
        password: !!room.password,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        owner: {
          id: room.owner.id,
          name: room.owner.name,
        }
      }));

      switch (sort) {
        case 'popular_desc': // 인기 많은 순
          mappedRooms.sort((a, b) => b.currentMembers - a.currentMembers || b.id - a.id);
          break;
        case 'popular_asc': // 인기 적은 순
          mappedRooms.sort((a, b) => a.currentMembers - b.currentMembers || b.id - a.id);
          break;
        case 'createdAt_desc': // 최신순
          mappedRooms.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          break;
        case 'createdAt_asc': // 과거순
          mappedRooms.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
          break;
        default:
          mappedRooms.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          break;
      }

      return mappedRooms;
    } catch (err) {
      console.error('DB 조회 에러:', err);
      throw new InternalServerErrorException('방 조회 중 문제가 발생했습니다.');
    }
  }

  // 방 하나 조회
  async getRoomById(roomId: number): Promise<RoomResponseDto> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ['owner'],
    });
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
        name: room.owner.name,
      }
    }
  }
}
