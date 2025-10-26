import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Req } from '@nestjs/common';
import { RoomUsersService } from './room-users.service';
import { CreateRoomUserDto } from './dto/create-room-user.dto';
import { UpdateRoomUserDto } from './dto/update-room-user.dto';

@Controller('room-users')
export class RoomUsersController {
  constructor(private readonly roomUsersService: RoomUsersService) {}

  @Get('/:roomId')
  getById(
    @Param('roomId', ParseIntPipe) roomId: number
  ) {
    return this.roomUsersService.getBannedUsersById(roomId);
  }
}
