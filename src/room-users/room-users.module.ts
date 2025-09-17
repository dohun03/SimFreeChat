import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from 'src/rooms/rooms.entity';
import { User } from 'src/users/users.entity';
import { RoomUsersController } from './room-users.controller';
import { RoomUser } from './room-users.entity';
import { RoomUsersService } from './room-users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Room, RoomUser])],
  controllers: [RoomUsersController],
  providers: [RoomUsersService],
  exports: [RoomUsersService]
})
export class RoomUsersModule {}
