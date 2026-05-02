import { forwardRef, Module } from '@nestjs/common';
import { RoomUsersService } from './room-users.service';
import { RoomUsersController } from './room-users.controller';
import { RoomUser } from './entities/room-users.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from 'src/rooms/entities/rooms.entity';
import { SocketModule } from 'src/socket/socket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoomUser, Room]),
    forwardRef(() => SocketModule)
  ],
  controllers: [RoomUsersController],
  providers: [RoomUsersService],
  exports: [RoomUsersService],
})
export class RoomUsersModule {}
