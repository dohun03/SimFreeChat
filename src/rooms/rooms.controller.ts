import { Body, Controller, Get, Param, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

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

  // 방 전체 조회
  @Get()
  findAll(@Query('search') search?: string) {
    return this.roomsService.getAllRooms(search);
  }

  // 방 하나 조회
  @Get('/:roomId')
  findOne(
    @Param('roomId') roomId: number,
    @Req() req: any
  ) {
    const sessionId = req.cookies['SESSIONID'];
    if (!sessionId) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    return this.roomsService.getRoom(sessionId, roomId);
  }
}
