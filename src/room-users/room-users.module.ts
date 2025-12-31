import { Module } from '@nestjs/common';
import { RoomUsersService } from './room-users.service';
import { RoomUsersController } from './room-users.controller';
import { RoomUser } from './room-user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from 'src/rooms/rooms.entity';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoomUser, Room]),
    RedisModule,
  ],
  controllers: [RoomUsersController],
  providers: [RoomUsersService],
  exports: [RoomUsersService],
})
export class RoomUsersModule {}
