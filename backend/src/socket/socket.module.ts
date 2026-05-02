import { forwardRef, Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { SocketService } from './socket.service';
import { User } from 'src/users/entities/users.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocketEvents } from './socket.events';
import { MessagesModule } from 'src/messages/messages.module';
import { RoomsModule } from 'src/rooms/rooms.module';
import { Room } from 'src/rooms/entities/rooms.entity';
import { RoomUsersModule } from 'src/room-users/room-users.module';
import { RoomUser } from 'src/room-users/entities/room-users.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Room, RoomUser]),
    MessagesModule,
    forwardRef(() => RoomsModule),
    forwardRef(() => RoomUsersModule)
  ],
  providers: [
    SocketGateway,
    SocketEvents,
    SocketService,
  ],
  exports: [SocketService, SocketEvents]
})
export class SocketModule {}
