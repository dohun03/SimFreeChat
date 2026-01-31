import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { ServerOptions } from 'socket.io';
import { INestApplication, Logger } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const redisOptions = {
      // 도커 네트워크 이름으로 수정
      host: process.env.REDIS_HOST || 'redis-service', 
      port: 6379,
      // 자폭 방지 설정
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };

    const pubClient = new Redis(redisOptions);
    const subClient = new Redis(redisOptions);

    // 에러 핸들러 무조건 등록
    pubClient.on('error', (err) => {
      this.logger.warn('[RedisAdapter-Pub] 연결 대기 중...');
    });
    subClient.on('error', (err) => {
      this.logger.warn('[RedisAdapter-Sub] 연결 대기 중...');
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