import { forwardRef, Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { SocketService } from './socket.service';
import { User } from 'src/users/users.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocketEvents } from './socket.events';
import { MessagesModule } from 'src/messages/messages.module';
import { RoomsModule } from 'src/rooms/rooms.module';
import { Room } from 'src/rooms/rooms.entity';
import { RoomUsersModule } from 'src/room-users/room-users.module';
import { RoomUser } from 'src/room-users/room-user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Room, RoomUser]),
    MessagesModule,
    RoomUsersModule,
    forwardRef(() => RoomsModule),
  ],
  providers: [
    SocketGateway,
    SocketEvents,
    SocketService,
  ],
  exports: [SocketService, SocketEvents]
})
export class SocketModule {}
