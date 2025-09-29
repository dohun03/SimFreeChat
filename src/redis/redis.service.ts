import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  // -----------------------------
  // 1. 세션 관리
  // -----------------------------
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

  // -----------------------------
  // 2. 채팅방 접속/퇴장 관리
  // -----------------------------
  async addUserToRoom(roomId: number, userId: number) {
    await this.redis.sadd(`room:${roomId}:online`, userId);
  }

  async removeUserFromRoom(roomId: number, userId: number) {
    await this.redis.srem(`room:${roomId}:online`, userId);
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
}
