import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomsService } from './rooms.service';
import { ChatService } from 'src/chat/chat.service';
import { SessionGuard } from 'src/auth/guards/session.guard';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly chatService: ChatService
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
    this.chatService.updateRoom(roomId, room);

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
    await this.chatService.deleteRoom(roomId);

    return { message: '삭제 되었습니다.' };
  }

  // 방 전체 조회
  @Get()
  getAll(@Query('search') search?: string) {
    return this.roomsService.getAllRooms(search);
  }

  // 방 하나 조회
  @UseGuards(SessionGuard)
  @Get('/:roomId')
  getById( @Param('roomId') roomId: number ) {
    return this.roomsService.getRoomById(roomId);
  }
}
