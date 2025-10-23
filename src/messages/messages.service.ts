import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from 'src/redis/redis.service';
import { Room } from 'src/rooms/rooms.entity';
import { User } from 'src/users/users.entity';
import { ILike, Repository } from 'typeorm';
import { CreateMessageDto } from './dto/create-message.dto';
import { ResponseMessageDto } from './dto/response-message.dto';
import { MessageLog } from './message-logs.entity';
import { Message } from './messages.entity';

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
    private readonly redisService: RedisService,
  ) {}

  async createMessage(createMessageDto: CreateMessageDto): Promise<ResponseMessageDto> {
    const { roomId, userId, content } = createMessageDto;

    try {
      const [room, user] = await Promise.all([
        this.roomRepository.findOne({ where: { id: roomId } }),
        this.userRepository.findOne({ where: { id: userId } }),
      ]);
    
      if (!room || !user) throw new NotFoundException('유효하지 않은 방 또는 유저입니다.');
  
      const newMessage = this.messageRepository.create({
        room,
        user,
        content
      });
      const message = await this.messageRepository.save(newMessage);
  
      const newMessageLog = this.messageLogRepository.create({
        roomId: room.id,
        roomName: room.name,
        userId: user.id,
        userName: user.name,
        messageId: message.id,
        messageContent: message.content,
        action: 'SEND'
      });
      await this.messageLogRepository.save(newMessageLog);
      
      const { password, ip_address, ...safeUser } = user;
      return {
        ...message,
        user: safeUser,
      };
    } catch (err) {
      console.error('메시지 생성 중 에러:', err);
      throw new InternalServerErrorException('메시지 전송 중 문제가 발생했습니다.');
    }
  }

  async getMessagesByRoom(roomId: number, search?: string): Promise<ResponseMessageDto[]> {
    const where: any = { room: { id: roomId } };
    const order: any = { id: 'ASC' };

    if (search) {
      where.content = ILike(`%${search}%`);
      order.id = 'DESC'; // 검색 시 내림차순으로 반환.
    }

    const messages = await this.messageRepository.find({
      where,
      order
    });

    return messages.map((msg) => {
      const { password, ip_address, ...safeUser } = msg.user;
      return {
        ...msg,
        user: safeUser
      }
    });
  }

  async getAllMessageLogs(sessionId: string, query: any) {
    const session = await this.redisService.getSession(sessionId);
    if (!session) throw new UnauthorizedException('세션이 존재하지 않습니다.');
  
    const admin = await this.userRepository.findOne({
      where: { id: session.userId },
    });
    if (!admin?.is_admin) throw new UnauthorizedException('권한이 없습니다.');

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
    
      const whereParams: any[] = [];
      let whereSql = ' WHERE 1=1';
    
      // 검색 조건
      if (search) {
        switch (searchType) {
          case 'message':
            whereSql += ' AND message_content LIKE ?';
            whereParams.push(`%${search}%`);
            break;
          case 'user':
            whereSql += ' AND user_name LIKE ?';
            whereParams.push(`%${search}%`);
            break;
          case 'room':
            whereSql += ' AND room_name LIKE ?';
            whereParams.push(`%${search}%`);
            break;
          default:
            whereSql += ' AND (message_content LIKE ? OR user_name LIKE ? OR room_name LIKE ?)';
            whereParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
            break;
        }
      }
    
      // 액션 타입 조건
      if (actionType) {
        whereSql += ' AND action = ?';
        whereParams.push(actionType);
      }
    
      // 날짜 조건
      if (startDate) {
        whereSql += ' AND created_at >= ?';
        whereParams.push(startDate);
      }
    
      if (endDate) {
        whereSql += ' AND created_at <= ?';
        whereParams.push(`${endDate} 23:59:59`);
      }
    
      // 전체 개수 조회
      const countSql = `SELECT COUNT(*) AS total FROM message_log${whereSql}`;
      const countResult = await this.messageLogRepository.query(countSql, whereParams);
      const totalCount = countResult[0]?.total || 0;
    
      // 데이터 조회 (페이징)
      const limit = Number(line) || 10;
      const offset = ((Number(currentPage) || 1) - 1) * limit;
      const dataSql = `SELECT * FROM message_log${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      const dataParams = [...whereParams, limit, offset];
      const messageLogs = await this.messageLogRepository.query(dataSql, dataParams);
    
      return {
        messageLogs,
        totalCount,
      };
    } catch (err) {
      console.error('메시지 로그 조회 중 오류 발생:', err);
      throw new InternalServerErrorException('메시지 로그 조회 중 문제가 발생했습니다.');
    }
  }
}
