import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { RoomUsersService } from './room-users.service';
import { SessionGuard } from 'src/auth/guards/session.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('room-users')
@ApiBearerAuth()
@Controller('room-users')
export class RoomUsersController {
  constructor(private readonly roomUsersService: RoomUsersService) {}

  @UseGuards(SessionGuard)
  @Get(':roomId')
  @ApiOperation({ summary: '방별 밴 유저 목록 조회' })
  @ApiParam({ name: 'roomId', type: Number, description: '방 ID' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 401, description: '로그인 필요' })
  getById(@Param('roomId', ParseIntPipe) roomId: number) {
    return this.roomUsersService.getBannedUsersByRoomId(roomId);
  }
  
  @UseGuards(SessionGuard)
  @Delete(':roomId/:targetUserId')
  @ApiOperation({ summary: '방별 밴 유저 해제' })
  @ApiParam({ name: 'roomId', type: Number, description: '방 ID' })
  @ApiParam({ name: 'targetUserId', type: Number, description: '해제 대상 유저 ID' })
  @ApiResponse({ status: 200, description: '해제 성공' })
  @ApiResponse({ status: 400, description: '해당 밴 유저가 존재하지 않음' })
  @ApiResponse({ status: 401, description: '로그인 필요' })
  @ApiResponse({ status: 404, description: '방을 찾을 수 없거나 방장이 아님' })
  deleteById(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @Req() req: any,
  ) {
    return this.roomUsersService.unBanUserById(roomId, targetUserId, req.user.id);
  }
}
