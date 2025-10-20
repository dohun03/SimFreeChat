import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './users.entity';
import { RedisService } from 'src/redis/redis.service';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ChatModule } from 'src/chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    RedisModule,
    ChatModule
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [TypeOrmModule],
})
export class UsersModule {}