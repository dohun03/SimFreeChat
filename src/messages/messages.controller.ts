import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService
  ) {}

  @Get('/:roomId')
  async getMessagesByRoom(
    @Param('roomId') roomId: number,
    @Query('search') search?: string
  ) {
    return this.messagesService.getMessagesByRoom(roomId, search);
  }
}
