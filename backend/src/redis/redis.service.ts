import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis'; // ← 여기서 타입 가져오기

@Injectable()
export class RedisService {
  constructor(@InjectRedis() private readonly redis: Redis) {} // 타입 변경

  // 세션 생성
  async createSession(userId: string, data: any, ttlSeconds = 3600 * 24) {
    await this.redis.set(`session:${userId}`, JSON.stringify(data), 'EX', ttlSeconds);
  }

  // 세션 조회
  async getSession(userId: string) {
    const session = await this.redis.get(`session:${userId}`);
    return session ? JSON.parse(session) : null;
  }

  // 세션 삭제 (로그아웃 / 밴)
  async deleteSession(userId: string) {
    await this.redis.del(`session:${userId}`);
  }
}