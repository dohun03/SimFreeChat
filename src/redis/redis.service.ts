import { Cron, CronExpression } from '@nestjs/schedule';
import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { Message } from 'src/messages/messages.entity';
import { MessageLog } from 'src/messages/message-logs.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class RedisService implements OnModuleInit {
  private isProcessing = false;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(MessageLog)
    private readonly messageLogRepository: Repository<MessageLog>,
  ) {}

  // 서버 구동 시 부분 초기화
  async onModuleInit() {
    try {
      const roomKeys = await this.redis.keys('room:users:*');
      const socketKeys = await this.redis.keys('user:sockets:*');
      const keysToDelete = [...roomKeys, ...socketKeys];

      if (keysToDelete.length > 0) {
        await this.redis.del(...keysToDelete);
        console.log(`[Redis] 초기화 완료: ${keysToDelete.length}개`);
      } else {
        console.log('[Redis] 초기화할 정보가 없습니다.');
      }
    } catch (error) {
      console.error('Redis 부분 초기화 실패:', error);
    }
  }

  // 1. 세션 관리
  async createSession(sessionId: string, data: any, ttlSeconds = 3600 * 24) {
    await this.redis.set(`session:${sessionId}`, JSON.stringify(data), 'EX', ttlSeconds);
  }

  async getSession(sessionId: string) {
    const session = await this.redis.get(`session:${sessionId}`);
    return session ? JSON.parse(session) : null;
  }

  async deleteSession(sessionId: string) {
    await this.redis.del(`session:${sessionId}`);
  }

  // 2. 채팅방 접속/퇴장 관리
  async addUserToRoom(roomId: number, userId: number) {
    await this.redis.sadd(`room:users:${roomId}`, userId);
  }

  async removeUserFromRoom(roomId: number, userId: number) {
    await this.redis.srem(`room:users:${roomId}`, userId);
  }

  async deleteRoom(roomId: number) {
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

  // { roomId: 유저 수 }
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
    } catch (error) {
      console.error('[Redis] 전체 접속자 수 합산 에러:', error);
      return 0;
    }
  }

  async isUserInRoom(roomId: number, userId: number) {
    return this.redis.sismember(`room:users:${roomId}`, userId);
  }

  // 3. 소켓 세션 관리 (Hash 구조 사용)
  // user:sockets:userId { field: socketId, value: roomId }
  async hSetUserSocket(userId: number, socketId: string, roomId: number) {
    const key = `user:sockets:${userId}`;
    await this.redis.hset(key, socketId, roomId);
    await this.redis.expire(key, 3600 * 24);
  }

  async hGetAllUserSockets(userId: number) {
    const key = `user:sockets:${userId}`;
    return this.redis.hgetall(key);
  }

  async hDelUserSocket(userId: number, socketId: string) {
    await this.redis.hdel(`user:sockets:${userId}`, socketId);
  }

  // 4. 메시지 관리

  // [방 별 캐시 메시지 조회]
  async getCacheMessagesByRoom(roomId: number): Promise<any[]> {
    const key = `room:messages:${roomId}`;
    const messages = await this.redis.lrange(key, 0, -1);
    return messages.map((msg) => JSON.parse(msg));
  }

  // [방별 캐시 메시지의 마지막 ID 조회]
  async getLastMessageId(roomId: number): Promise<string | undefined> {
    const key = `room:messages:${roomId}`;
    const latest = await this.redis.lindex(key, 0);
    if (!latest) return undefined;
    try {
      return JSON.parse(latest).id;
    } catch {
      return undefined;
    }
  }

  // [방별 캐시 메시지 삭제]
  async deleteAllCacheMessagesByRoom(roomId: number) {
    await this.redis.del(`room:messages:${roomId}`);
  }

  // [방별 버퍼 메시지 삭제]
  async deleteAllBufferMessagesByRoom(roomId: number) {
    const key = 'buffer:messages';

    const items = await this.redis.lrange(key, 0, -1);
    if (items.length === 0) return;

    const filteredItems = items.filter((item) => {
      try {
        const parsed = JSON.parse(item);
        return Number(parsed.room?.id) !== roomId;
      } catch {
        return true; 
      }
    });

    if (items.length !== filteredItems.length) {
      await this.redis.del(key);
      if (filteredItems.length > 0) {
        await this.redis.rpush(key, ...filteredItems);
      }
      console.log(`[Redis] ${key}에서 방 ${roomId}의 대기 메시지 ${items.length - filteredItems.length}건을 정리했습니다.`);
    }
  }

  // [방 별 캐시 메시지 삭제]
  async deleteCacheMessageByRoom(roomId: number, messageId: string) {
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
    console.log(`캐시에서 ${messageId} 메시지를 삭제했습니다.`);

    return true;
  }

  // [버퍼 메시지&로그 저장]
  async pushMessageAndLog(messageData: any, logData: any) {
    const roomId = messageData.room.id;
    const cacheKey = `room:messages:${roomId}`;
    const multi = this.redis.multi();

    // DB 저장용 버퍼에 추가
    multi.lpush('buffer:messages', JSON.stringify(messageData));
    multi.lpush('buffer:logs', JSON.stringify(logData));

    // 조회용 최신 100개 캐시 유지
    multi.lpush(cacheKey, JSON.stringify(messageData));
    multi.ltrim(cacheKey, 0, 99);

    const results = await multi.exec();

    // [수정] 500개 이상 쌓였고, 현재 처리 중이 아니면 즉시 실행
    const messageCount = await this.redis.llen('buffer:messages');
    if (messageCount >= 500 && !this.isProcessing) {
      this.handleBufferToDb().catch(err => console.error('[Immediate-Batch] Error:', err));
    }

    return results;
  }

  // [버퍼 메시지&로그 삭제]
  async deleteMessageAndLog(roomId: number, userId: number, messageId: string): Promise<boolean> {
    const bufferKey = 'buffer:messages';
    const logKey = 'buffer:logs';

    // 1. 버퍼 리스트를 가져옴
    const items = await this.redis.lrange(bufferKey, 0, -1);

    // 2. 해당 메시지 위치 찾기
    const index = items.findIndex((item) => {
      const msg = JSON.parse(item);
      return msg.id === messageId && msg.user.id === userId && msg.room.id === roomId;
    });
    if (index === -1) return false;

    // 3. 찾았다면 수정 작업 진행
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
    multi.lpush(logKey, JSON.stringify(deleteLog));
    await multi.exec();
    
    return true;
  }

  // 5. 메시지 배치 작업 (1분마다 실행)
  @Cron(CronExpression.EVERY_MINUTE)
  async handleBufferToDb() {
    if (this.isProcessing) return;

    if (process.env.NODE_APP_INSTANCE && process.env.NODE_APP_INSTANCE !== '0') {
      return;
    }

    this.isProcessing = true;
    console.log(`[Batch] 배치 작업을 시작합니다.`);

    try {
      await this.processBuffer('buffer:messages', this.messageRepository);
      await this.processBuffer('buffer:logs', this.messageLogRepository);
      await this.clearUserQueryCache();
    } catch (error) {
      console.error(`[Batch] 처리 중 치명적 에러:`, error);
    } finally {
      this.isProcessing = false; // 작업 완료 처리
    }
  }

  private async processBuffer(key: string, repository: Repository<any>) {
    const tempKey = `${key}:temp`;
    let dataExists = false;

    try {
      const len = await this.redis.llen(key);
      if (len === 0) return;

      await this.redis.rename(key, tempKey);
      dataExists = true;

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
        await repository
        .createQueryBuilder()
        .insert()
        .values(parsedData)
        .orIgnore() // ID 중복 시 해당 데이터 제외 후 저장
        .execute();
      }

      await this.redis.del(tempKey);
      console.log(`[Batch] ${key} -> DB 저장 완료 (${parsedData.length}개)`);
      
    } catch (error) {
      console.error(`[Batch] ${key} 처리 중 에러:`, error);
      if (dataExists) {
        try {
          const items = await this.redis.lrange(tempKey, 0, -1);
          if (items.length > 0) {
            await this.redis.rpush(key, ...items);
            await this.redis.del(tempKey);
            console.warn(`[Batch] ${key} 데이터 복구 완료`);
          }
        } catch (recoveryError) {
          console.error('데이터 복구 실패:', recoveryError);
        }
      }
    }
  }

  // 6. 메시지 로그 조회 캐시

  // [쿼리 캐시 저장]
  async setUserQueryCache(userId: number, queryStr: string, totalCount: number) {
    const key = `user:logs:count:${userId}`;
    const data = JSON.stringify({ queryStr, totalCount });
    await this.redis.set(key, data, 'EX', 3600);
  }

  // [쿼리 캐시 조회]
  async getUserQueryCache(userId: number): Promise<{ queryStr: string; totalCount: number } | null> {
    const key = `user:logs:count:${userId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }
  // [쿼리 캐시 일괄 삭제]
  private async clearUserQueryCache() {
    const keys = await this.redis.keys('user:logs:count:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
