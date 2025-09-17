import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RedisService } from 'src/redis/redis.service';
import { UsersModule } from 'src/users/users.module';
import { ChatModule } from 'src/chat/chat.module';

@Module({
  imports: [UsersModule, ChatModule],
  providers: [AuthService, RedisService],
  controllers: [AuthController],
})
export class AuthModule {}
