import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from 'src/rooms/entities/rooms.entity';
import { User } from 'src/users/entities/users.entity';
import { MessageLog } from './entities/message-logs.entity';
import { MessagesController } from './messages.controller';
import { Message } from './entities/messages.entity';
import { MessagesService } from './messages.service';
import { RoomSummary } from './entities/room-summaries.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, MessageLog, RoomSummary,Room, User]),
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService]
})
export class MessagesModule {}
