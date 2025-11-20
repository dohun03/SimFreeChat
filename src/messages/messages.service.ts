import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Room } from 'src/rooms/rooms.entity';
import { User } from 'src/users/users.entity';
import { ILike, Repository } from 'typeorm';
import { ResponseMessageDto } from './dto/response-message.dto';
import { MessageLog } from './message-logs.entity';
import { Message, MessageType } from './messages.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(MessageLog)
    private readonly messageLogRepository: Repository<MessageLog>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createMessage(roomId: number, userId: number, content: string, type: string): Promise<ResponseMessageDto> {
    try {
      const [room, user] = await Promise.all([
        this.roomRepository.findOne({ where: { id: roomId } }),
        this.userRepository.findOne({ where: { id: userId } }),
      ]);
    
      if (!room || !user) throw new NotFoundException('유효하지 않은 방 또는 유저입니다.');
  
      const messageType: MessageType = type === 'image' ? MessageType.IMAGE : MessageType.TEXT;

      const newMessage = this.messageRepository.create({
        room,
        user,
        content,
        type: messageType
      });
      const message = await this.messageRepository.save(newMessage);
  
      const newMessageLog = this.messageLogRepository.create({
        roomId: room.id,
        roomName: room.name,
        userId: user.id,
        userName: user.name,
        messageId: message.id,
        messageContent: message.content,
        action: 'SEND',
        type: messageType
      });
      await this.messageLogRepository.save(newMessageLog);
      
      const { password, ...safeUser } = user;
      return {
        ...message,
        user: safeUser,
      };
    } catch (err) {
      console.error('메시지 생성 중 에러:', err);
      throw new InternalServerErrorException('메시지 전송 중 문제가 발생했습니다.');
    }
  }

  async deleteMessage(roomId: number, userId: number, messageId: number): Promise<number> {
    try {
      const message = await this.messageRepository.findOne({
        where: {
          id: messageId,
          room: { id: roomId },
          user: { id: userId },
        }
      });
      if (!message || message.isDeleted) throw new BadRequestException('메시지를 삭제할 수 없습니다.');
  
      message.isDeleted = true;

      await this.messageRepository.save(message);

      const deletedMessageLog = this.messageLogRepository.create({
        roomId: message.room.id,
        roomName: message.room.name,
        userId: message.user.id,
        userName: message.user.name,
        messageId: message.id,
        messageContent: message.content,
        action: 'DELETE'
      });
      await this.messageLogRepository.save(deletedMessageLog);

      return message.id;
    } catch (err) {
      console.error('메시지 삭제 실패:', err);
      throw new InternalServerErrorException('서버에서 메시지 삭제 중 오류가 발생했습니다.');
    }
  }

  async getMessagesByRoom(roomId: number, search?: string): Promise<ResponseMessageDto[]> {
    const where: any = { room: { id: roomId } };
    const order: any = { id: 'ASC' };

    if (search) {
      where.content = ILike(`%${search}%`);
      where.isDeleted = false;
      where.type = 'text';
      order.id = 'DESC'; // 검색 시 내림차순으로 반환.
    }

    const messages = await this.messageRepository.find({
      where,
      order
    });

    return messages.map((msg) => {
      const { password, ...safeUser } = msg.user;
      return {
        ...msg,
        user: safeUser
      }
    });
  }

  async getAllMessageLogs(userId: number, query: any): Promise<{ messageLogs: MessageLog[], totalCount: number }> {
    const admin = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!admin?.isAdmin) throw new ForbiddenException('권한이 없습니다.');
  
    try {
      const {
        search,
        searchType,
        startDate,
        endDate,
        actionType,
        line,
        currentPage,
      } = query;
  
      const limit = Number(line) || 10;
      const page = Number(currentPage) || 1;
      const offset = (page - 1) * limit;
  
      const qb = this.messageLogRepository.createQueryBuilder('log');
  
      // 검색 조건
      if (search) {
        switch (searchType) {
          case 'message':
            qb.andWhere('log.message_content LIKE :search', { search: `%${search}%` });
            break;
          case 'user':
            qb.andWhere('log.user_name LIKE :search', { search: `%${search}%` });
            break;
          case 'room':
            qb.andWhere('log.room_name LIKE :search', { search: `%${search}%` });
            break;
          default:
            qb.andWhere(
              '(log.message_content LIKE :search OR log.user_name LIKE :search OR log.room_name LIKE :search)',
              { search: `%${search}%` },
            );
            break;
        }
      }
  
      // 액션 타입 조건
      if (actionType) {
        qb.andWhere('log.action = :action', { action: actionType });
      }
  
      // 날짜 조건
      if (startDate) {
        qb.andWhere('log.created_at >= :startDate', { startDate });
      }
      if (endDate) {
        qb.andWhere('log.created_at <= :endDate', { endDate: `${endDate} 23:59:59` });
      }
  
      // 전체 개수 조회
      const totalCount = await qb.getCount();
  
      // 데이터 조회 (페이징)
      const messageLogs = await qb
        .orderBy('log.created_at', 'DESC')
        .limit(limit)
        .offset(offset)
        .getMany();
  
      return { messageLogs, totalCount };
    } catch (err) {
      console.error('메시지 로그 조회 중 오류 발생:', err);
      throw new InternalServerErrorException('메시지 로그 조회 중 문제가 발생했습니다.');
    }
  }  
}
