import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { RoomUsersService } from './room-users.service';
import { SessionGuard } from 'src/auth/guards/session.guard';

@Controller('room-users')
export class RoomUsersController {
  constructor(private readonly roomUsersService: RoomUsersService) {}

  @UseGuards(SessionGuard)
  @Get('/:roomId')
  getById(
    @Param('roomId', ParseIntPipe) roomId: number,
  ) {
    return this.roomUsersService.getBannedUsersByRoomId(roomId);
  }
  
  @UseGuards(SessionGuard)
  @Delete('/:roomId/:targetUserId')
  deleteById(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @Req() req: any
  ) {
    return this.roomUsersService.unBanUserById(roomId, targetUserId, req.user.id);
  }
}
