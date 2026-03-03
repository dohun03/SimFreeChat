import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from 'src/rooms/rooms.entity';
import { User } from 'src/users/users.entity';
import { MessageLog } from './message-logs.entity';
import { MessagesController } from './messages.controller';
import { Message } from './messages.entity';
import { MessagesService } from './messages.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, MessageLog, Room, User]),
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService]
})
export class MessagesModule {}
