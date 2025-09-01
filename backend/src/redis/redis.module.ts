import { Module, Global } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      url: 'redis://localhost:6379', // 또는 'redis://127.0.0.1:6379'
    }),
  ],
  providers: [RedisService],
  exports: [RedisModule, RedisService],
})
export class RedisGlobalModule {}