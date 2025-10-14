import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomsService } from './rooms.service';
import { ChatService } from 'src/chat/chat.service';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly chatService: ChatService
  ) {}

  // 방 생성
  @Post()
  create(
    @Body() createRoomDto: CreateRoomDto,
    @Req() req: any
  ) {
    const sessionId = req.cookies['SESSIONID'];
    if (!sessionId) throw new UnauthorizedException('세션이 존재하지 않습니다.');
    
    return this.roomsService.createRoom(sessionId, createRoomDto);
  }

  // 방 수정
  @Patch('/:roomId')
  async update(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() updateRoomDto: UpdateRoomDto,
    @Req() req: any
  ) {
    const sessionId = req.cookies['SESSIONID'];
    if (!sessionId) throw new UnauthorizedException('세션이 존재하지 않습니다.');
    
    const room = await this.roomsService.updateRoom(roomId, sessionId, updateRoomDto);
    this.chatService.updateRoom(roomId, room);

    return room;
  }

  // 방 삭제
  @Delete('/:roomId')
  async delete(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Req() req: any
  ) {
    const sessionId = req.cookies['SESSIONID'];
    if (!sessionId) throw new UnauthorizedException('세션이 존재하지 않습니다.');
    
    await this.roomsService.deleteRoom(roomId, sessionId);
    await this.chatService.deleteRoom(roomId);

    return { message: '삭제 되었습니다.' };
  }

  // 방 전체 조회
  @Get()
  getAll(@Query('search') search?: string) {
    return this.roomsService.getAllRooms(search);
  }

  // 방 하나 조회
  @Get('/:roomId')
  getById(
    @Param('roomId') roomId: number,
    @Req() req: any
  ) {
    const sessionId = req.cookies['SESSIONID'];
    if (!sessionId) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    return this.roomsService.getRoom(sessionId, roomId);
  }
}
