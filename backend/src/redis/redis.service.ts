import { Cron, CronExpression } from '@nestjs/schedule';
import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { Message } from 'src/messages/messages.entity';
import { MessageLog } from 'src/messages/message-logs.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/users.entity';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private isProcessing = false;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(MessageLog)
    private readonly messageLogRepository: Repository<MessageLog>,
  ) {}

  // 서버 구동 시 부분 초기화
  async onModuleInit() {
    try {
      const roomUsers = await this.redis.keys('room:users:*');
      const userSockets = await this.redis.keys('user:sockets:*');
      const userRooms = await this.redis.keys('user:rooms:*');
      const keysToDelete = [...roomUsers, ...userSockets, ...userRooms];

      if (keysToDelete.length > 0) {
        await this.redis.del(...keysToDelete);
        this.logger.log(`[REDIS_INIT_SUCCESS] 삭제개수:${keysToDelete.length} | 임시 세션 데이터 정리 완료`);
      }
    } catch (err) {
      this.logger.error(`[REDIS_INIT_ERROR] 사유:${err.message}`, err.stack);
    }
  }

  // 1. 세션 관리

  // 로그인: (세션, 세션매핑키, 유저캐시) 생성
  async setLoginUserData(sessionId: string, userId: number, profileData: any) {
    const oldSessionId = await this.redis.get(`user:session:mapping:${userId}`);

    const multi = this.redis.multi();

    if (oldSessionId) {
      multi.del(`session:${oldSessionId}`);
      this.logger.log(`USER_SESSION_REPLACED [SUCCESS] 유저ID:${userId} | 기존세션:${oldSessionId} 파괴`);
    }

    multi.set(`session:${sessionId}`, userId, 'EX', 3600 * 24);
    multi.set(`user:session:mapping:${userId}`, sessionId, 'EX', 3600 * 24);
    multi.set(`user:profile:${userId}`, JSON.stringify(profileData), 'EX', 3600 * 24 * 7);

    await multi.exec();
  }

  // 세션 조회
  async getUserIdBySession(sessionId: string): Promise<number | null> {
    const userId = await this.redis.get(`session:${sessionId}`);
    return userId ? Number(userId) : null;
  }

  // 로그아웃: (세션, 세션매핑키) 삭제
  async delSessionByUserId(userId: number) {
    const sessionId = await this.redis.get(`user:session:mapping:${userId}`);
    
    // 매핑이 없다는 건 이미 세션이 죽었다는 뜻
    if (!sessionId) {
      await this.redis.del(`user:session:mapping:${userId}`);
      return;
    }

    const multi = this.redis.multi();

    multi.del(`session:${sessionId}`);
    multi.del(`user:session:mapping:${userId}`);

    await multi.exec();
    this.logger.log(`USER_FORCE_LOGOUT [SUCCESS] 유저ID:${userId} 기반 삭제 완료`);
  }

  // 2. 유저 관리
  async setUserProfile(userId: number, data: any) {
    await this.redis.set(`user:profile:${userId}`, JSON.stringify(data), 'EX', 3600 * 24 * 7);
  }

  async getUserProfile(userId: number) {
    const key = `user:profile:${userId}`;
    const cacheUser = await this.redis.get(key);

    if (cacheUser) return JSON.parse(cacheUser);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const { password, ...safeUser } = user;
    
    await this.redis.set(key, JSON.stringify(safeUser), 'EX', 3600 * 24 * 7);

    return safeUser;
  }

  // 3. 방별 유저 관리
  async addRoomUser(roomId: number, userId: number) {
    await this.redis.sadd(`room:users:${roomId}`, userId);
  }

  async delRoomUser(roomId: number, userId: number) {
    await this.redis.srem(`room:users:${roomId}`, userId);
  }

  async delRoomUserAll(roomId: number) {
    await this.redis.del(`room:users:${roomId}`);
  }

  async getAllRoomKeys() {
    return this.redis.keys('room:users:*');
  }

  async getRoomUsers(roomId: number) {
    return this.redis.smembers(`room:users:${roomId}`);
  }

  async getRoomUserCount(roomId: number) {
    return this.redis.scard(`room:users:${roomId}`);
  }

  async getRoomUserCountsBulk(roomIds: number[]): Promise<Record<number, number>> {
    if (roomIds.length === 0) return {};

    const pipeline = this.redis.pipeline();
    roomIds.forEach((id) => {
      pipeline.scard(`room:users:${id}`);
    });

    const results = await pipeline.exec();
    if (!results) return {};

    const countsMap: Record<number, number> = {};
    
    results.forEach(([err, count], index) => {
      const roomId = roomIds[index];
      countsMap[roomId] = err ? 0 : Number(count) || 0;
    });

    return countsMap;
  }

  async getRoomTotalUserCount(): Promise<number> {
    try {
      const keys = await this.redis.keys('room:users:*');
      if (keys.length === 0) return 0;

      const pipeline = this.redis.pipeline();
      keys.forEach(key => {
        pipeline.scard(key);
      });

      const results = await pipeline.exec();
      if (!results) return 0;

      return results.reduce((acc, [err, count]) => {
        if (err) return acc;
        return acc + (Number(count) || 0);
      }, 0);
    } catch (err) {
      this.logger.error(`[REDIS_COUNT_ERROR] 전체 접속자 합산 오류 | 사유:${err.message}`, err.stack);
      return 0;
    }
  }

  async isUserInRoom(roomId: number, userId: number) {
    return this.redis.sismember(`room:users:${roomId}`, userId);
  }

  // 3.5. 유저+방 관련 데이터 삭제
  async delUserRoomRelation(roomId: number, userId: number): Promise<void> {
    const multi = this.redis.multi();
    
    multi.srem(`room:users:${roomId}`, userId);
    multi.srem(`user:rooms:${userId}`, roomId);

    const results = await multi.exec();
    
    if (!results) {
      throw new Error('Redis 트랜잭션 실행 실패');
    }
  }

  // 4. 유저별 방 관리
  async addUserRoom(userId: number, roomId: number) {
    await this.redis.sadd(`user:rooms:${userId}`, roomId);
    await this.redis.expire(`user:rooms:${userId}`, 3600 * 24);
  }

  async delUserRoom(userId: number, roomId: number) {
    await this.redis.srem(`user:rooms:${userId}`, roomId);
  }

  async getUserRooms(userId: number): Promise<string[]> {
    return this.redis.smembers(`user:rooms:${userId}`);
  }

  // 5. 유저별 소켓 세션 관리 (Hash 구조 사용)
  // user:sockets:userId { field: socketId, value: roomId }
  async setUserSocket(userId: number, socketId: string, roomId: number) {
    const key = `user:sockets:${userId}`;
    await this.redis.hset(key, socketId, roomId);
    await this.redis.expire(key, 3600 * 24);
  }

  async delUserSocket(userId: number, socketId: string) {
    await this.redis.hdel(`user:sockets:${userId}`, socketId);
  }

  async getUserSockets(userId: number) {
    const key = `user:sockets:${userId}`;
    return this.redis.hgetall(key);
  }

  // 6. 메시지 관리

  // [방별 캐시 메시지 조회]
  async getRoomMessageCache(roomId: number): Promise<any[]> {
    const key = `room:messages:${roomId}`;
    const messages = await this.redis.lrange(key, 0, -1);
    return messages.map((msg) => JSON.parse(msg));
  }

  // [방별 캐시 메시지의 마지막 ID 조회]
  async getRoomLastMessageId(roomId: number): Promise<string | undefined> {
    const key = `room:messages:${roomId}`;
    const latest = await this.redis.lindex(key, -1);
    if (!latest) return undefined;
    try {
      return JSON.parse(latest).id;
    } catch {
      return undefined;
    }
  }

  // [방별 특정 캐시 메시지 삭제]
  async delRoomMessageCache(roomId: number, messageId: string) {
    const key = `room:messages:${roomId}`;
  
    const items = await this.redis.lrange(key, 0, -1);
    
    // messageId가 일치하는 위치 찾기
    const index = items.findIndex((item) => {
      try {
        return JSON.parse(item).id === messageId;
      } catch {
        return false;
      }
    });
    if (index === -1) return false;

    // 해당 메시지 삭제 상태로 변경
    const msgObj = JSON.parse(items[index]);
    msgObj.isDeleted = true;
    await this.redis.lset(key, index, JSON.stringify(msgObj));

    return true;
  }
  
  // [방별 전체 캐시 메시지 삭제]
  async delRoomMessageCacheAll(roomId: number) {
    await this.redis.del(`room:messages:${roomId}`);
  }

  // [버퍼 메시지&로그 저장]
  async pushMessageAndLog(messageData: any, logData: any) {
    const roomId = messageData.room.id;
    const multi = this.redis.multi();

    // DB 저장용 버퍼에 추가
    multi.rpush('buffer:messages', JSON.stringify(messageData));
    multi.rpush('buffer:logs', JSON.stringify(logData));

    // 조회용 최신 100개 캐시 유지
    multi.rpush(`room:messages:${roomId}`, JSON.stringify(messageData));
    multi.ltrim(`room:messages:${roomId}`, -100, -1);

    const results = await multi.exec();

    // 500개 이상 쌓였고, 현재 처리 중이 아니면 즉시 실행
    const messageCount = await this.redis.llen('buffer:messages');
    if (messageCount >= 500 && !this.isProcessing) {
      this.handleBufferToDb().catch(
        err => this.logger.error(`[BATCH_DIRECT_RUN_ERROR] 즉시 배치 실행 실패 | 사유:${err.message}`, err.stack)
      );
    }

    return results;
  }

  // [버퍼 메시지&로그 삭제]
  async delMessageAndLog(roomId: number, userId: number, messageId: string): Promise<boolean> {
    const bufferKey = 'buffer:messages';
    const logKey = 'buffer:logs';

    // 버퍼 리스트를 가져옴
    const items = await this.redis.lrange(bufferKey, 0, -1);

    // 해당 메시지 위치 찾기
    const index = items.findIndex((item) => {
      const msg = JSON.parse(item);
      return msg.id === messageId && msg.user.id === userId && msg.room.id === roomId;
    });
    if (index === -1) return false;

    // 찾았다면 수정 작업 진행
    const msgObj = JSON.parse(items[index]);
    const multi = this.redis.multi();

    // 삭제 로그 생성
    const deleteLog = {
      roomId: msgObj.room.id,
      roomName: msgObj.room.name,
      roomOwnerId: msgObj.room.owner.id,
      userId: msgObj.user.id,
      userName: msgObj.user.name,
      messageId: msgObj.id,
      messageContent: msgObj.content,
      type: msgObj.type,
      action: 'DELETE',
      createdAt: new Date().toISOString()
    };

    msgObj.isDeleted = true;

    multi.lset(bufferKey, index, JSON.stringify(msgObj));
    multi.rpush(logKey, JSON.stringify(deleteLog));
    await multi.exec();
    
    return true;
  }

  async getLock(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(key, 'locked', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  // 메시지 배치 작업 (1분마다 실행)
  @Cron(CronExpression.EVERY_MINUTE)
  async handleBufferToDb() {
    if (this.isProcessing) return;

    const lockKey = 'lock:batch-message-processing';
    const hasLock = await this.getLock(lockKey, 50);
    if (!hasLock) return;

    this.isProcessing = true;
    this.logger.log(`[BATCH_PROCESS_START] 메시지 및 로그 DB 저장 시작`);

    try {
      await this.processBuffer('buffer:messages', this.messageRepository);
      await this.processBuffer('buffer:logs', this.messageLogRepository);
      await this.delUserLogQueryCacheAll();
    } catch (err) {
      this.logger.error(`[BATCH_CRITICAL_ERROR] 배치 전체 흐름 중단 | 사유:${err.message}`, err.stack);
    } finally {
      this.isProcessing = false; // 작업 완료 처리
    }
  }

  private async processBuffer(key: string, repository: Repository<any>) {
    const tempKey = `${key}:temp`;

    try {
      const len = await this.redis.llen(key);
      if (len === 0) return;

      await this.redis.rename(key, tempKey);

      const data = await this.redis.lrange(tempKey, 0, -1);
      const parsedData = data.map((item) => {
        const obj = JSON.parse(item);
        if (obj.createdAt) obj.createdAt = new Date(obj.createdAt);
        if (key === 'buffer:logs') {
          obj.room_id = obj.roomId;
          obj.room_name = obj.roomName;
          obj.room_owner_id = obj.roomOwnerId;
          obj.user_id = obj.userId;
          obj.user_name = obj.userName;
          obj.message_id = obj.messageId;
          obj.message_content = obj.messageContent;
          obj.created_at = obj.createdAt;
        }

        return obj;
      });

      if (parsedData.length > 0) {
        const CHUNK_SIZE = 500;
        for (let i = 0; i < parsedData.length; i += CHUNK_SIZE) {
          const chunk = parsedData.slice(i, i + CHUNK_SIZE);
          await repository
            .createQueryBuilder()
            .insert()
            .values(chunk)
            .orIgnore()
            .execute();
        }
      }

      this.logger.log(`[BATCH_SAVE_SUCCESS] 키:${key} | 총 저장개수:${parsedData.length} | DB 저장 완료`);
      
    } catch (err) {
      this.logger.error(`[BATCH_KEY_PROCESS_ERROR] 키:${key} | 사유:${err.message}`, err.stack);
    } finally {
      await this.redis.del(tempKey);
    }
  }

  // 7. 메시지 로그 조회 캐시

  // [쿼리 캐시 저장]
  async setUserLogQueryCache(userId: number, queryStr: string, totalCount: number) {
    const key = `user:logs:count:${userId}`;
    const data = JSON.stringify({ queryStr, totalCount });
    await this.redis.set(key, data, 'EX', 3600);
  }

  // [쿼리 캐시 조회]
  async getUserLogQueryCache(userId: number): Promise<{ queryStr: string; totalCount: number } | null> {
    const key = `user:logs:count:${userId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  // [쿼리 캐시 일괄 삭제]
  private async delUserLogQueryCacheAll() {
    const keys = await this.redis.keys('user:logs:count:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}