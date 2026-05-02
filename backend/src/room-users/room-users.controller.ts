import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { RoomUsersService } from './room-users.service';
import { SessionGuard } from 'src/auth/guards/session.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { RestrictUserDto } from './dto/restric-user.dto';

@ApiTags('room-users')
@ApiBearerAuth()
@Controller('room-users')
export class RoomUsersController {
  constructor(private readonly roomUsersService: RoomUsersService) {}

  @UseGuards(SessionGuard)
  @Get(':roomId')
  @ApiOperation({ summary: '방별 유저 목록 조회' })
  @ApiParam({ name: 'roomId', type: Number, description: '방 ID' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 401, description: '로그인 필요' })
  getById(@Param('roomId', ParseIntPipe) roomId: number) {
    return this.roomUsersService.getRoomUsers(roomId);
  }
  
  @UseGuards(SessionGuard)
  @Post(':roomId/:targetUserId/restrict')
  @ApiOperation({ summary: '유저 제재' })
  @ApiParam({ name: 'roomId', type: Number, description: '방 ID' })
  @ApiParam({ name: 'targetUserId', type: Number, description: '제재 대상 유저 ID' })
  async restrictUser(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @Body() dto: RestrictUserDto,
    @Req() req: any
  ) {
    return await this.roomUsersService.restrictUser(roomId, targetUserId, dto, req.user.id);
  }

  @UseGuards(SessionGuard)
  @Patch(':roomId/:targetUserId/unrestrict')
  @ApiOperation({ summary: '유저 제재 해제' })
  @ApiParam({ name: 'roomId', type: Number, description: '방 ID' })
  @ApiParam({ name: 'targetUserId', type: Number, description: '해제 대상 유저 ID' })
  async unrestrictUser(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @Req() req: any
  ) {
    return await this.roomUsersService.unrestrictUser(roomId, targetUserId, req.user.id);
  }
}
