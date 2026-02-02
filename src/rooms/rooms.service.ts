import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from 'src/redis/redis.service';
import { LessThan, Like, Repository } from 'typeorm';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Room } from './rooms.entity';
import * as bcrypt from 'bcrypt';
import { RoomResponseDto } from './dto/response-room.dto';
import { User } from 'src/users/users.entity';
import { SocketEvents } from 'src/socket/socket.events';
import path from 'path';
import * as fs from 'fs';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);
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
      this.logger.error('DB 저장 에러:', err);
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

      this.logger.log(`방 수정: User(${userId})가 Room(${roomId}) 정보를 수정함 (Name: ${!!name}, Max: ${!!maxMembers}, Pwd: ${!!password})`);
  
      return {
        ...updatedRoom,
        password: !!updatedRoom.password,
      }
    } catch (err) {
      this.logger.error('DB 저장 에러:', err);
      throw new InternalServerErrorException('방 수정 중 문제가 발생했습니다.');
    }
  }

  // 방 임시 삭제
  async softDeleteRoom(roomId: number, userId: number): Promise<void> {
    try {
      const result = await this.roomRepository.softDelete({
        id: roomId,
        owner: { id: userId }
      });
      if (result.affected === 0) throw new BadRequestException('방이 존재하지 않거나 권한이 없습니다.');

      this.logger.log(`방 삭제: User(${userId})가 Room(${roomId}을 삭제했습니다.`);

      const roomUsersArray = await this.redisService.getRoomUsers(roomId);

      roomUsersArray.map(uid => this.socketEvents.deleteRoom(roomId, Number(uid)));
    } catch (err) {
      this.logger.error('DB 삭제 에러:', err);
      throw new InternalServerErrorException('방 삭제 중 문제가 발생했습니다.');
    }
  }

  // 방 영구 삭제 스케줄러
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async deleteOldRooms() {
    const lockKey = 'lock:delete-old-rooms';
    const hasLock = await this.redisService.getLock(lockKey, 60);
    if (!hasLock) return;

    this.logger.log('방 삭제: 스케줄러 가동');

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    try {
      const expiredRooms = await this.roomRepository.find({
        where: {
          deletedAt: LessThan(oneWeekAgo), // deletedAt < oneWeekAgo
        },
        withDeleted: true, // 소프트 삭제된 데이터 포함
      });

      if (expiredRooms.length === 0) {
        this.logger.log('방 삭제: 삭제 대상인 방이 없습니다.');
        return;
      }

      for (const room of expiredRooms) {
        await this.roomRepository.delete(room.id);

        const roomDir = path.join(process.cwd(), 'uploads/rooms', room.id.toString());
        if (fs.existsSync(roomDir)) {
          await fs.promises.rm(roomDir, { recursive: true, force: true })
            .catch(e => this.logger.error(`Room(${room.id}) 파일 삭제 실패:`, e));
        }

        await this.redisService.deleteRoom(room.id);
        await this.redisService.deleteAllCacheMessagesByRoom(room.id);

        this.logger.log(`방 삭제: Room(${room.id}) 영구 삭제 완료`);
      }
    } catch (err) {
      this.logger.error('방 삭제: 스케줄러 작업 중 에러 발생:', err);
    }
  }

  // 방 전체 유저 조회
  async getRoomTotalUserCount(): Promise<number> {
    return this.redisService.getRoomTotalUserCount();
  }

  // 방 전체 조회
  async getAllRooms(sort: string = 'popular_desc', search?: string): Promise<RoomResponseDto[]> {
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
      this.logger.error('DB 조회 에러:', err);
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
