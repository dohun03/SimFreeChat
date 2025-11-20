import { Body, Controller, Get, Param, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { SessionGuard } from 'src/auth/guards/session.guard';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService
  ) {}

  @UseGuards(SessionGuard)
  @Get('logs')
  async getAllMessageLogs(
    @Req() req: any,
    @Query() query: any
  ) {
    return this.messagesService.getAllMessageLogs(req.user.userId, query);
  }

  @Get('/:roomId')
  async getMessagesByRoom(
    @Param('roomId') roomId: number,
    @Query('search') search?: string
  ) {
    return this.messagesService.getMessagesByRoom(roomId, search);
  }
}
