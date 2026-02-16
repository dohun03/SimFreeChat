import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomsService } from './rooms.service';
import { SocketService } from 'src/socket/socket.service';
import { SessionGuard } from 'src/auth/guards/session.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ResponseRoomDto } from './dto/response-room.dto';

@ApiTags('rooms')
@ApiBearerAuth()
@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly socketService: SocketService
  ) {}

  // 방 생성
  @UseGuards(SessionGuard)
  @Post()
  @ApiOperation({ summary: '방 생성' })
  @ApiResponse({ status: 201, description: '생성 성공', type: ResponseRoomDto })
  @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
  @ApiResponse({ status: 401, description: '로그인 필요' })
  async create(
    @Body() createRoomDto: CreateRoomDto,
    @Req() req: any
  ): Promise<ResponseRoomDto> {
    return this.roomsService.createRoom(req.user.id, createRoomDto);
  }

  // 방 수정
  @UseGuards(SessionGuard)
  @Patch('/:roomId')
  @ApiOperation({ summary: '방 수정' })
  @ApiParam({ name: 'roomId', type: Number })
  @ApiResponse({ status: 200, description: '수정 성공', type: ResponseRoomDto })
  @ApiResponse({ status: 400, description: '방이 존재하지 않거나 권한이 없습니다.' })
  @ApiResponse({ status: 401, description: '로그인 필요' })
  async update(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() updateRoomDto: UpdateRoomDto,
    @Req() req: any
  ): Promise<ResponseRoomDto> {
    const room = await this.roomsService.updateRoom(roomId, req.user.id, updateRoomDto);
    this.socketService.updateRoom(roomId, room);

    return room;
  }

  // 방 삭제
  @UseGuards(SessionGuard)
  @Delete('/:roomId')
  @ApiOperation({ summary: '방 삭제' })
  @ApiParam({ name: 'roomId', type: Number })
  @ApiResponse({ status: 200, description: '삭제 완료' })
  @ApiResponse({ status: 400, description: '방이 존재하지 않거나 권한이 없습니다.' })
  @ApiResponse({ status: 401, description: '로그인 필요' })
  async delete(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Req() req: any
  ): Promise<{ message: string }> {
    await this.roomsService.softDeleteRoom(roomId, req.user.id);

    return { message: '삭제 되었습니다.' };
  }

  // 방 전체 유저 조회
  @Get('total-users')
  @ApiOperation({ summary: '전체 채팅 참여자 수 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getTotalUsers(): Promise<number> {
    return this.roomsService.getRoomTotalUserCount();
  }

  // 방 전체 조회
  @Get()
  @ApiOperation({ summary: '방 목록 조회 및 검색' })
  @ApiQuery({ name: 'sort', required: false, enum: ['popular_desc', 'recent_desc'], description: '정렬 기준' })
  @ApiQuery({ name: 'search', required: false, description: '검색어' })
  @ApiResponse({ status: 200, description: '조회 성공', type: [ResponseRoomDto] })
  async getAll(
    @Query('sort') sort: string = 'popular_desc',
    @Query('search') search?: string,
  ): Promise<ResponseRoomDto[]> {
    return this.roomsService.getAllRooms(sort, search);
  }

  // 방 하나 조회
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: '방 상세 정보 조회' })
  @ApiParam({ name: 'roomId', type: Number })
  @ApiResponse({ status: 200, description: '조회 성공', type: ResponseRoomDto })
  @ApiResponse({ status: 401, description: '로그인 필요' })
  @ApiResponse({ status: 404, description: '방을 찾을 수 없음' })
  @Get('/:roomId')
  async getById( @Param('roomId', ParseIntPipe) roomId: number ): Promise<ResponseRoomDto> {
    return this.roomsService.getRoomById(roomId);
  }
}
