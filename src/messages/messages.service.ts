import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMeSsageDto } from './dto/create-message.dto';
import { ResponseMessageDto } from './dto/response-message.dto';
import { Message } from './messages.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>
  ) {}

  async createMessage(createMeSsageDto: CreateMeSsageDto): Promise<ResponseMessageDto> {
    const { roomId, userId, content } = createMeSsageDto;

    const newMessage = this.messageRepository.create({
      room: { id: roomId },
      user: { id: userId },
      content
    });

    const savedMessage = await this.messageRepository.save(newMessage);

    const message = await this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['user']
    });

    if (!message) {
      throw new Error('메세지를 찾을 수 없습니다.');
    }
    
    return {
      id: message.id,
      content: message.content,
      created_at: message.created_at,
      updated_at: message.updated_at,
      user: {
        id: message.user.id,
        username: message.user.username,
        is_admin: message.user.is_admin,
        is_banned: message.user.is_banned,
        created_at: message.user.created_at,
        updated_at: message.user.updated_at,
      },
    };
  }

  async getMessagesByRoom(roomId: number): Promise<ResponseMessageDto[]> {
    const messages = await this.messageRepository.find({
      where: { room: { id: roomId} },
      relations: ['user']
    });

    return messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      created_at: msg.created_at,
      updated_at: msg.updated_at,
      user: {
        id: msg.user.id,
        username: msg.user.username,
        is_admin: msg.user.is_admin,
        is_banned: msg.user.is_banned,
        created_at: msg.user.created_at,
        updated_at: msg.user.updated_at,
      },
    }));
  }
}
