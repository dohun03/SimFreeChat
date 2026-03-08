import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { SessionGuard } from 'src/auth/guards/session.guard';
import { MessagesService } from './messages.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GetAllMessageLogsQueryDto } from './dto/get-all-message-logs-query.dto';
import { GetRoomMessagesDto } from './dto/get-room-messages.dto';

@ApiTags('messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @UseGuards(SessionGuard)
  @Get('logs')
  @ApiOperation({ summary: '메시지 로그 조회 (관리자)'})
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 401, description: '로그인 필요' })
  @ApiResponse({ status: 403, description: '관리자 권한 없음' })
  async getAllMessageLogs(
    @Req() req: any,
    @Query() query: GetAllMessageLogsQueryDto
  ) {
    return this.messagesService.getAllMessageLogs(req.user, query);
  }

  @UseGuards(SessionGuard)
  @Get('log/metadata')
  @ApiOperation({ 
    summary: '메시지 로그 메타 데이터 조회', 
    description: '로그 필터링에 필요한 메타데이터(ID 목록)를 가져옵니다.' 
  })
  @ApiResponse({ status: 200, description: '성공' })
  @ApiResponse({ status: 401, description: '로그인 필요' })
  async getMessageLogMetaData() {
    return this.messagesService.getMessageLogMetaData();
  }

  @UseGuards(SessionGuard)
  @Get(':roomId/summary')
  @ApiOperation({ 
    summary: '채팅방 메시지 AI 요약', 
    description: 'Gemini AI를 사용하여 채팅방 대화 내용을 요약합니다.' 
  })
  @ApiParam({ name: 'roomId', type: Number, description: '방 ID' })
  @ApiResponse({ status: 200, description: '요약 완료' })
  @ApiResponse({ status: 401, description: '로그인 필요' })
  async getAiMessagesSummary(@Param('roomId') roomId: number) {
    return this.messagesService.getAiMessagesSummary(roomId);
  }

  @UseGuards(SessionGuard)
  @Get(':roomId/search')
  @ApiOperation({ summary: '채팅방 메시지 검색' })
  @ApiParam({ name: 'roomId', type: Number, description: '방 ID' })
  @ApiParam({ name: 'roomId', type: Number, description: '방 ID' })
  @ApiQuery({ name: 'keyword', type: String, description: '검색할 키워드', required: true })
  @ApiQuery({ name: 'cursorId', type: String, description: '마지막으로 본 메시지 ID (다음 페이지용)', required: false })
  async searchMessages(
    @Param('roomId') roomId: number,
    @Query('keyword') keyword: string,
    @Query('cursorId') cursorId?: string,
  ) {
    return await this.messagesService.searchMessages(roomId, keyword, cursorId);
  }

  @UseGuards(SessionGuard)
  @Get(':roomId/context')
  @ApiOperation({ summary: '특정 메시지의 주변 메시지 조회 (검색 이동용)' })
  @ApiParam({ name: 'roomId', type: Number, description: '방 ID' })
  @ApiQuery({ 
    name: 'targetId', 
    type: String, 
    description: '중심 메시지 ID', 
    required: true 
  })
  async getMessageContext(
    @Param('roomId') roomId: number,
    @Query('targetId') targetId: string,
  ) {
    return await this.messagesService.getSearchedMessageAround(roomId, targetId);
  }

  @UseGuards(SessionGuard)
  @Get(':roomId')
  @ApiOperation({ summary: '채팅방 메시지 조회'})
  @ApiParam({ name: 'roomId', type: Number, description: '방 ID' })
  @ApiResponse({ status: 200, description: '성공' })
  @ApiResponse({ status: 401, description: '로그인 필요' })
  @ApiResponse({ status: 404, description: '유효하지 않은 방 ID' })
  async getMessagesByRoom(
    @Param('roomId') roomId: number,
    @Query() query: GetRoomMessagesDto
  ) {
    return this.messagesService.getMessagesByRoom(roomId, query);
  }
}
