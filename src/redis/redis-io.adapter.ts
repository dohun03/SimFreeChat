import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, RedisClientType } from 'redis';
import { ServerOptions } from 'socket.io';
import { INestApplication } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private pubClient: RedisClientType;
  private subClient: RedisClientType;

  constructor(app: INestApplication) {
    super(app);
  }

  async connectToRedis() {
    this.pubClient = createClient({
      url: 'redis://127.0.0.1:6379',
    });

    this.subClient = this.pubClient.duplicate();

    await this.pubClient.connect();
    await this.subClient.connect();
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: true,
        credentials: true,
      },
    });

    server.adapter(createAdapter(this.pubClient, this.subClient));
    return server;
  }
}
