import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomsService } from './rooms.service';
import { SocketService } from 'src/socket/socket.service';
import { SessionGuard } from 'src/auth/guards/session.guard';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly socketService: SocketService
  ) {}

  // 방 생성
  @UseGuards(SessionGuard)
  @Post()
  create(
    @Body() createRoomDto: CreateRoomDto,
    @Req() req: any
  ) {
    return this.roomsService.createRoom(req.user.userId, createRoomDto);
  }

  // 방 수정
  @UseGuards(SessionGuard)
  @Patch('/:roomId')
  async update(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() updateRoomDto: UpdateRoomDto,
    @Req() req: any
  ) {
    const room = await this.roomsService.updateRoom(roomId, req.user.userId, updateRoomDto);
    this.socketService.updateRoom(roomId, room);

    return room;
  }

  // 방 삭제
  @UseGuards(SessionGuard)
  @Delete('/:roomId')
  async delete(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Req() req: any
  ) {
    await this.roomsService.deleteRoom(roomId, req.user.userId);

    return { message: '삭제 되었습니다.' };
  }

  // 방 전체 유저 조회
  @Get('total-users')
  async getTotalUsers() {
    return this.roomsService.getRoomTotalUserCount();
  }

  // 방 전체 조회
  @Get()
  getAll(
    @Query('sort') sort: string = 'popular_desc',
    @Query('search') search?: string,
  ) {
    return this.roomsService.getAllRooms(sort, search);
  }

  // 방 하나 조회
  @UseGuards(SessionGuard)
  @Get('/:roomId')
  getById( @Param('roomId') roomId: number ) {
    return this.roomsService.getRoomById(roomId);
  }
}
