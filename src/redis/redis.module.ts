import { Module, Global } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RedisService } from './redis.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from 'src/messages/messages.entity';
import { MessageLog } from 'src/messages/message-logs.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Message, MessageLog]),
    ConfigModule,
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: `redis://${config.get<string>('REDIS_HOST')}:${config.get<number>('REDIS_PORT')}`,
        options: {
          maxRetriesPerRequest: null,
          retryStrategy: (times) => Math.min(times * 100, 3000),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [RedisService],
  exports: [RedisModule, RedisService],
})
export class RedisGlobalModule {}