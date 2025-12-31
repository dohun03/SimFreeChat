import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  // 서버가 구동 시 초기화
  async onModuleInit() {
    try {
      await this.redis.flushall();
      console.log('Redis 초기화 완료!');
    } catch (error) {
      console.error('Redis 초기화 실패:', error);
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
    await this.redis.sadd(`room:${roomId}:online`, userId);
  }

  async removeUserFromRoom(roomId: number, userId: number) {
    await this.redis.srem(`room:${roomId}:online`, userId);
  }

  async deleteRoom(roomId: number) {
    await this.redis.del(`room:${roomId}:online`);
  }

  async getAllRoomKeys() {
    return this.redis.keys('room:*:online');
  }

  async getRoomUsers(roomId: number) {
    return this.redis.smembers(`room:${roomId}:online`);
  }

  async getRoomUserCount(roomId: number) {
    return this.redis.scard(`room:${roomId}:online`);
  }

  async isUserInRoom(roomId: number, userId: number) {
    return this.redis.sismember(`room:${roomId}:online`, userId);
  }

  // 3. 소켓 세션 관리 (Hash 구조 사용)
  // key: user:sockets:userId { field: socketId, value: roomId }
  
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
}
