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

  @UseGuards(SessionGuard)
  @Get('log/metadata')
  async getMessageLogMetaData() {
    return this.messagesService.getMessageLogMetaData();
  }

  @Get('/:roomId')
  async getMessagesByRoom(
    @Param('roomId') roomId: number,
    @Query() query: any
  ) {
    return this.messagesService.getMessagesByRoom(roomId, query);
  }

  // TEST 메시지 전송
  @UseGuards(SessionGuard)
  @Post('/test')
  async loadTestSendMessage(
    @Req() req: any,
    @Body() body: any,
  ) {
    const { roomId, content, type } = body;

    if (!roomId || !content) {
      throw new UnauthorizedException('roomId / content 누락');
    }

    return this.messagesService.createMessage(
      Number(roomId),
      req.user.userId,
      content,
      type ?? 'text',
    );
  }
}
