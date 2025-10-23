import { Body, Controller, Get, Param, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService
  ) {}

  @Get('logs')
  async getAllMessageLogs(
    @Req() req: any,
    @Query() query: any
  ) {
    const sessionId = req.cookies['SESSIONID'];
    if (!sessionId) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    return this.messagesService.getAllMessageLogs(sessionId, query);
  }

  @Get('/:roomId')
  async getMessagesByRoom(
    @Param('roomId') roomId: number,
    @Query('search') search?: string
  ) {
    return this.messagesService.getMessagesByRoom(roomId, search);
  }
}
