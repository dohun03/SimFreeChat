import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { RoomUsersService } from './room-users.service';

@Controller('room-users')
export class RoomUsersController {
  constructor(private readonly roomUsersService: RoomUsersService) {}

  @Post('/:roomId/join')
  async joinRoom(@Param('roomId') roomId: number, @Req() req: any) {
    const sessionId = req.cookies['SESSIONID'];
    return this.roomUsersService.joinRoom(roomId, sessionId);
  }

  @Post('/:roomId/leave')
  async leaveRoom(@Param('roomId') roomId: number, @Req() req: any) {
    const sessionId = req.cookies['SESSIONID'];
    return this.roomUsersService.leaveRoom(roomId, sessionId);
  }
}
