import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { ServerOptions } from 'socket.io';
import { INestApplication } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const redisOptions = {
      // ⭐️ 도커 네트워크 이름으로 수정 (중요!)
      host: process.env.REDIS_HOST || 'redis-service', 
      port: 6379,
      // ⭐️ 자폭 방지 설정
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };

    const pubClient = new Redis(redisOptions);
    const subClient = new Redis(redisOptions); // duplicate 대신 명확하게 생성

    // ⭐️ 에러 핸들러 무조건 등록 (안 하면 missing error handler 뜹니다)
    pubClient.on('error', (err) => {
      console.warn('⚠️ [RedisAdapter-Pub] 연결 대기 중...');
    });
    subClient.on('error', (err) => {
      console.warn('⚠️ [RedisAdapter-Sub] 연결 대기 중...');
    });

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: true,
        credentials: true,
      },
    });

    server.adapter(this.adapterConstructor);
    return server;
  }
}