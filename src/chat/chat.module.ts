import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { RedisGlobalModule } from '../redis/redis.module';
import { User } from 'src/users/users.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatEvents } from './chat.events';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    RedisGlobalModule
  ],
  providers: [ChatGateway, ChatEvents, ChatService],
  exports: [ChatService]
})
export class ChatModule {}
