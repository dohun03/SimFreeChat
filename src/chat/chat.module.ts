import { forwardRef, Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { RedisGlobalModule } from '../redis/redis.module';
import { User } from 'src/users/users.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatEvents } from './chat.events';
import { MessagesModule } from 'src/messages/messages.module';
import { RoomsModule } from 'src/rooms/rooms.module';
import { Room } from 'src/rooms/rooms.entity';

console.log(RoomsModule);

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Room]),
    RedisGlobalModule,
    MessagesModule,
    forwardRef(() => RoomsModule),
  ],
  providers: [ChatGateway, ChatEvents, ChatService],
  exports: [ChatService]
})
export class ChatModule {}
