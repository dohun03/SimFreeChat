import { Body, Controller, Get, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  createRoom(
    @Body() createRoomDto: CreateRoomDto,
    @Req() req: any
  ) {
    const sessionId = req.cookies['SESSIONID'];
    if (!sessionId) throw new UnauthorizedException('세션이 존재하지 않습니다.');
    
    return this.roomsService.createRoom(sessionId, createRoomDto);
  }

  @Get()
  getAllRooms(@Query('search') search?: string) {
    return this.roomsService.getAllRooms(search);
  }
}
