import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './users.entity';
import { RedisService } from 'src/redis/redis.service';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [TypeOrmModule.forFeature([User]), RedisModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [TypeOrmModule],
})
export class UsersModule {}