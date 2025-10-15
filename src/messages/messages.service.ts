import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMessageDto } from './dto/create-message.dto';
import { ResponseMessageDto } from './dto/response-message.dto';
import { Message } from './messages.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>
  ) {}

  async createMessage(createMessageDto: CreateMessageDto): Promise<ResponseMessageDto> {
    const { roomId, userId, content } = createMessageDto;

    const newMessage = this.messageRepository.create({
      room: { id: roomId },
      user: { id: userId },
      content
    });
    try {
      const savedMessage = await this.messageRepository.save(newMessage);

      const message = await this.messageRepository.findOne({
        where: { id: savedMessage.id },
      });
      if (!message) throw new NotFoundException('메세지를 찾을 수 없습니다.');
      
      const { password, ip_address, ...safeUser } = message.user;
  
      return {
        ...message,
        user: safeUser,
      };
    } catch (err) {
      console.error('DB 생성 에러:', err);
      throw new InternalServerErrorException('메시지 전송 중 문제가 발생했습니다.');
    }
  }

  async getMessagesByRoom(roomId: number): Promise<ResponseMessageDto[]> {
    const messages = await this.messageRepository.find({
      where: { room: { id: roomId } },
    });

    return messages.map((msg) => {
      const { password, ip_address, ...safeUser } = msg.user;
      return {
        ...msg,
        user: safeUser
      }
    });
  }
}
