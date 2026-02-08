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
import { BCRYPT_SALT_ROUNDS } from 'src/common/constans';

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
  async createRoom(userId: number, createRoomDto: CreateRoomDto) {
    const { name, maxMembers, password } = createRoomDto;

    const owner = await this.userRepository.findOne({ where: { id: userId } });
    if (!owner) throw new NotFoundException('유저를 찾을 수 없습니다.');

    const hashedPassword = password ? await bcrypt.hash(password, BCRYPT_SALT_ROUNDS) : null;

    const room = this.roomRepository.create({
      name, owner, maxMembers, password: hashedPassword,
    });

    try {
      const savedRoom = await this.roomRepository.save(room);
      this.logger.log(`[ROOM_CREATE_SUCCESS] 방ID:${savedRoom.id} | 생성자:${userId}`);
      
      return { ...savedRoom, password: !!savedRoom.password };
    } catch (err) {
      this.logger.error(`[ROOM_CREATE_ERROR] 유저ID:${userId} | 사유:${err.message}`);
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
    if (!room) {
      this.logger.warn(`[ROOM_UPDATE_DENIED] 방ID:${roomId} | 유저ID:${userId} | 사유:권한 없음`);
      throw new BadRequestException('방이 존재하지 않거나 권한이 없습니다.');
    }
    
    try {
      if (name !== undefined) room.name = name;
      if (maxMembers !== undefined) room.maxMembers = maxMembers;
      if (password !== undefined) room.password = password === null ? null : await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  
      const updatedRoom = await this.roomRepository.save(room);
  
      return {
        ...updatedRoom,
        password: !!updatedRoom.password,
      }
    } catch (err) {
      this.logger.error(`[ROOM_UPDATE_ERROR] 방ID:${roomId} | 유저ID:${userId} | 사유:${err.message}`, err.stack);
      throw new InternalServerErrorException('방 수정 중 문제가 발생했습니다.');
    }
  }

  // 방 임시 삭제
  async softDeleteRoom(roomId: number, ownerId: number): Promise<void> {
    await this.roomRepository.manager.transaction(async (transaction) => {
      try {
        const result = await transaction.softDelete(Room, {
          id: roomId,
          owner: { id: ownerId }
        });
        if (result.affected === 0) {
          this.logger.warn(`[ROOM_DELETE_DENIED] 권한 없음 | 방ID:${roomId} | 유저ID:${ownerId}`);
          throw new BadRequestException('방이 존재하지 않거나 권한이 없습니다.');
        }

        const roomUsersArray = await this.redisService.getRoomUsers(roomId);

        if (roomUsersArray.length > 0) {
          await Promise.all(
            roomUsersArray.map(async (uidStr) => {
              const uid = Number(uidStr);

              this.socketEvents.deleteRoom(roomId, uid);
              await this.redisService.delUserRoomRelation(roomId, uid);
            })
          );
        }

        await this.redisService.delRoomUserAll(roomId);

        this.logger.log(`[ROOM_SOFT_DELETE] 방ID:${roomId} | 유저ID:${ownerId} | 퇴장인원:${roomUsersArray.length}명`);

      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        
        this.logger.error(`[ROOM_SOFT_DELETE_ERROR] 방ID:${roomId} | 유저ID:${ownerId} | 사유:${err.message}`, err.stack);
        throw new InternalServerErrorException('방 삭제 중 문제가 발생했습니다.');
      }
    });
  }

  // 방 영구 삭제 스케줄러
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async deleteOldRooms() {
    const lockKey = 'lock:delete-old-rooms';
    const hasLock = await this.redisService.getLock(lockKey, 60);
    if (!hasLock) return;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 1);

    try {
      const expiredRooms = await this.roomRepository.find({
        where: {
          deletedAt: LessThan(oneWeekAgo), // deletedAt < oneWeekAgo
        },
        withDeleted: true, // 소프트 삭제된 데이터 포함
      });

      if (expiredRooms.length === 0) return;

      for (const room of expiredRooms) {
        await this.roomRepository.delete(room.id);

        const roomDir = path.join(process.cwd(), 'uploads/rooms', room.id.toString());
        if (fs.existsSync(roomDir)) {
          await fs.promises.rm(roomDir, { recursive: true, force: true })
            .catch(e => this.logger.warn(`[ROOM_FILE_DELETE_ERROR] 방ID:${room.id} | 사유:파일 제거 실패`));
        }

        await this.redisService.delRoomMessageCacheAll(room.id);

        this.logger.log(`[ROOM_DELETE_SUCCESS] 방ID:${room.id} | 영구 삭제 및 캐시 정리 완료`);
      }
    } catch (err) {
      this.logger.error(`[ROOM_DELETE_ERROR] 스케줄러 중단 | 사유:${err.message}`, err.stack);
    }
  }

  // 방 전체 유저 조회
  async getRoomTotalUserCount(): Promise<number> {
    return this.redisService.getRoomTotalUserCount();
  }

  // 방 전체 조회
  async getAllRooms(sort: string = 'popular_desc', search?: string): Promise<RoomResponseDto[]> {
    const qb = this.roomRepository.createQueryBuilder('room')
      .leftJoinAndSelect('room.owner', 'owner')
      .select([
        'room.id', 'room.name', 'room.maxMembers', 'room.password',
        'room.createdAt', 'room.updatedAt',
        'owner.id', 'owner.name'
      ]);

    if (search) qb.andWhere('room.name LIKE :search', { search: `%${search}%` });

    // 날짜 정렬
    if (sort === 'createdAt_desc') qb.orderBy('room.createdAt', 'DESC');
    else if (sort === 'createdAt_asc') qb.orderBy('room.createdAt', 'ASC');
    else qb.orderBy('room.id', 'DESC');

    const rooms = await qb.getMany();
    if (rooms.length === 0) return [];

    const countsMap = await this.redisService.getRoomUserCountsBulk(rooms.map(r => r.id));

    const mappedRooms = rooms.map(room => ({
      ...room,
      currentMembers: countsMap[room.id] || 0,
      password: !!room.password,
    }));

    // 인원수 정렬
    if (sort.startsWith('popular')) {
      mappedRooms.sort((a, b) => 
        sort === 'popular_desc' 
          ? b.currentMembers - a.currentMembers || b.id - a.id
          : a.currentMembers - b.currentMembers || b.id - a.id
      );
    }
    return mappedRooms;
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
