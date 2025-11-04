import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Req, UnauthorizedException } from '@nestjs/common';
import { RoomUsersService } from './room-users.service';
import { CreateRoomUserDto } from './dto/create-room-user.dto';
import { UpdateRoomUserDto } from './dto/update-room-user.dto';

@Controller('room-users')
export class RoomUsersController {
  constructor(private readonly roomUsersService: RoomUsersService) {}
  @Get('/:roomId')
  getById(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Req() req: any
  ) {
    const sessionId = req.cookies['SESSIONID'];
    if (!sessionId) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    return this.roomUsersService.getBannedUsersById(roomId);
  }
  
  @Delete('/:roomId/:userId')
  deleteById(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: any
  ) {
    const sessionId = req.cookies['SESSIONID'];
    if (!sessionId) throw new UnauthorizedException('세션이 존재하지 않습니다.');
    
    this.roomUsersService.unBanUserById(roomId, userId, sessionId);
  }
}
