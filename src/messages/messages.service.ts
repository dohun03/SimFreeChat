import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Room } from 'src/rooms/rooms.entity';
import { User } from 'src/users/users.entity';
import { Repository, DataSource } from 'typeorm';
import { ResponseMessageDto } from './dto/response-message.dto';
import { MessageLog } from './message-logs.entity';
import { Message, MessageType } from './messages.entity';
import { RedisService } from 'src/redis/redis.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);
  private lastTimestamp = 0;
  private sequence = 0;

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(MessageLog)
    private readonly messageLogRepository: Repository<MessageLog>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  // 고유 ID 생성 메서드
  private generateCustomId(): string {
    const now = Date.now();
    const workerId = (process.env.NODE_APP_INSTANCE || '0').padStart(2, '0');

    if (now === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) % 1000;
    } else {
      this.sequence = 0;
      this.lastTimestamp = now;
    }

    const seqStr = this.sequence.toString().padStart(3, '0');
    
    return `${now}${workerId}${seqStr}`;
  }

  async createMessage(
    roomId: number,
    userId: number,
    content: string,
    type: string
  ): Promise<{ message: ResponseMessageDto; lastMessageId?: string }> {
    try {
      const [room, user] = await Promise.all([
        this.roomRepository.findOne({ 
          where: { id: roomId },
          select: ['id', 'name'],
          relations: ['owner']
        }),
        this.userRepository.findOne({ 
          where: { id: userId },
          select: ['id', 'name', 'isAdmin']
        }),
      ]);
      if (!room || !user) throw new NotFoundException('유효하지 않은 방 또는 유저입니다.');

      const lastMessageId = await this.redisService.getRoomLastMessageId(roomId);
      
      const messageId = this.generateCustomId();
      const messageType: MessageType = type === 'image' ? MessageType.IMAGE : MessageType.TEXT;
      const messageAction = 'SEND';

      const message = {
        id: messageId,
        content: content,
        type: messageType,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: null,
        user: {
          id: user.id,
          name: user.name,
          isAdmin: user.isAdmin
        },
        room: { 
          id: room.id, 
          name: room.name, 
          owner: { id: room.owner?.id } 
        },
      };

      const messageLog = {
        roomId: room.id,
        roomName: room.name,
        roomOwnerId: room.owner?.id,
        userId: user.id,
        userName: user.name,
        messageId: message.id,
        messageContent: message.content,
        type: message.type,
        action: messageAction,
        createdAt: message.createdAt,
      }

      await this.redisService.pushMessageAndLog(message, messageLog);

      return { message, lastMessageId };

    } catch (err) {
      this.logger.error(`[MESSAGE_SEND_ERROR] 방ID:${roomId} | 유저ID:${userId} | 사유:${err.message}`, err.stack);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('메시지 전송 중 문제가 발생했습니다.');
    }
  }

  async deleteMessage(roomId: number, userId: number, messageId: string): Promise<string> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId, room: { id: roomId }, user: { id: userId } },
      relations: ['room', 'room.owner', 'user'],
    });

    try {
      // DB에 메시지가 있을 경우
      if (message) {
        await this.dataSource.transaction(async (manager) => {
          if (message.isDeleted) {
            throw new BadRequestException('이미 삭제된 메시지입니다.');
          }

          await manager.update(Message, messageId, { isDeleted: true });
          await manager.insert(MessageLog, {
            roomId: message.room.id,
            roomName: message.room.name,
            roomOwnerId: message.room.owner?.id,
            userId: message.user.id,
            userName: message.user.name,
            messageId: message.id,
            messageContent: message.content,
            type: message.type,
            action: 'DELETE',
            createdAt: new Date(),
          });
          await this.redisService.delRoomMessageCache(roomId, messageId);
        });
      } else { // Redis에만 있을 경우
        await this.redisService.delMessageAndLog(roomId, userId, messageId);
        await this.redisService.delRoomMessageCache(roomId, messageId);
      }

      return messageId;

    } catch (err) {
      this.logger.error(`[MESSAGE_DELETE_ERROR] 방ID:${roomId} | 유저ID:${userId} | 메시지ID:${messageId} | 사유:${err.message}`,err.stack);
      throw new InternalServerErrorException('메시지 삭제 중 오류가 발생했습니다.');
    }
  }
  
  async getMessagesByRoom(roomId: number, query: any): Promise<ResponseMessageDto[]> {
    const { cursor, direction } = query;
    const limit = 100;

    // 캐시 메시지 반환
    if (!cursor) {
      const cachedMessages = await this.redisService.getRoomMessageCache(roomId);
      if (cachedMessages.length > 0) return cachedMessages;
    }

    // DB 메시지 반환
    const qb = this.messageRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'u')
      .select(['m', 'u.id', 'u.name', 'u.isAdmin'])
      .where('m.room_id = :roomId', { roomId });

    if (direction === 'before') {
      qb.andWhere('m.id < :cursor', { cursor }).orderBy('m.id', 'DESC');
    }
    else if (direction === 'recent') {
      qb.andWhere('m.id > :cursor', { cursor }).orderBy('m.id', 'ASC');
    }

    const messages = await qb.limit(limit).getMany();

    return messages;
  }

  async getMissedMessages(roomId: number, lastMessageId: string): Promise<ResponseMessageDto[]> {
    try {
      const cachedMessages = await this.redisService.getRoomMessageCache(roomId);
      const missedMessages = cachedMessages
        .filter(msg => msg.id > lastMessageId)
        .sort((a, b) => (a.id > b.id ? 1 : -1));

      //캐시 범위 벗어나면 DB조회 해야할까..?

      return missedMessages;
    } catch (err) {
      this.logger.error(`[GET_MISSED_MESSAGES_ERROR] 방ID:${roomId} | 사유:${err.message}`);
      return [];
    }
  }

  async getAiMessagesSummary(roomId: number) {
    const cachedMessages = await this.redisService.getRoomMessageCache(roomId);
    if (!cachedMessages) return { summary: "내용 없음" };
    if (cachedMessages.length < 20) return { summary: "대화가 부족하여 요약할 수 없습니다." };

    // 데이터 포맷팅
    const chatContext = cachedMessages
      .filter(msg => !msg.isDeleted && msg.type === 'text')
      .slice(0, 50)
      .reverse()
      .map(msg => `${msg.user.name}: ${msg.content}`)
      .join('\n');
      
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    // 프롬프트 작성 (데이터 주입)
    const prompt = `
      다음은 실시간 채팅방의 대화 내용이다.
      사용자들의 대화를 분석해서 다음 형식으로 요약해줘:
      
      1. 주제 요약 (한 줄로 핵심만)
      2. 주요 대화 내용 (누가 어떤 말을 했는지 포함하여 3~5개 불렛포인트)
      3. 전체적인 분위기 (예: 즐거움, 화남, 평온함 등 한 단어)
      4. 핵심 키워드 (대화에서 가장 중요한 단어 3~5개를 선택해서 #키워드 형식으로 나열)

      대화 내용:
      ${chatContext}
    `;

    const startTime = Date.now();

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const summaryText = response.text();

      const duration = Date.now() - startTime;

      this.logger.log(`[AI_SUMMARY_SUCCESS] 방ID:${roomId} | 소요시간:${duration}ms`);

      return { summary: summaryText };
    } catch (err) {
      this.logger.error(`[AI_SUMMARY_ERROR] 방ID:${roomId} | 사유:${err.message}`, err.stack);
      return { summary: "AI 요약 중 오류가 발생했습니다." };
    }
  }

  async getAllMessageLogs(user: any, query: any): Promise<{ messageLogs: MessageLog[]; totalCount: number }> {
    if (!user?.isAdmin) {
      this.logger.warn(`[ADMIN_ACCESS_DENIED] 유저ID:${user.id} | 사유:권한없음`);
      throw new ForbiddenException('권한이 없습니다.');
    }

    try {
      const {
        search, searchType, startDate, endDate,
        messageType, actionType, roomIdType, 
        roomOwnerIdType, userIdType, line, cursor, direction,
      } = query;

      const qb = this.messageLogRepository.createQueryBuilder('log');

      if (search) {
        const target = searchType 
          ? ({ message: 'log.message_content', user: 'log.user_name', room: 'log.room_name' }[searchType]) 
          : '(log.message_content LIKE :search OR log.user_name LIKE :search OR log.room_name LIKE :search)';

        if (!searchType) {
          qb.andWhere(target, { search: `%${search}%` });
        } else {
          qb.andWhere(`${target} LIKE :search`, { search: `%${search}%` });
        }
      }
      if (startDate) qb.andWhere('log.created_at >= :startDate', { startDate });
      if (endDate) qb.andWhere('log.created_at <= :endDate', { endDate: `${endDate} 23:59:59` });
      if (messageType) qb.andWhere('log.type = :messageType', { messageType });
      if (actionType) qb.andWhere('log.action = :actionType', { actionType });
      if (roomIdType) qb.andWhere('log.room_id = :roomIdType', { roomIdType });
      if (roomOwnerIdType) qb.andWhere('log.room_owner_id = :roomOwnerIdType', { roomOwnerIdType });
      if (userIdType) qb.andWhere('log.user_id = :userIdType', { userIdType });

      const dataQb = qb.clone();

      if (direction === 'prev') {
        dataQb.andWhere('log.id > :cursor', { cursor }).orderBy('log.id', 'ASC');
      } else {
        if (cursor) dataQb.andWhere('log.id < :cursor', { cursor });
        dataQb.orderBy('log.id', 'DESC');
      }

      const messageLogs = await dataQb.limit(Number(line) || 100).getMany();

      // 카운트 캐싱 로직
      const currentQueryStr = JSON.stringify({
        search, searchType, startDate, endDate, messageType,
        actionType, roomIdType, roomOwnerIdType, userIdType,
      });

      const cachedData = await this.redisService.getUserLogQueryCache(user.id);
      let totalCount: number;

      // 캐시 적중 시 COUNT 쿼리 생략
      if (cachedData && cachedData.queryStr === currentQueryStr) {
        totalCount = cachedData.totalCount;
      } else {
        const row = await qb.select('COUNT(log.id)', 'count').getRawOne();
        totalCount = Number(row.count);
        await this.redisService.setUserLogQueryCache(user.id, currentQueryStr, totalCount);
      }

      return { messageLogs, totalCount };

    } catch (err) {
      this.logger.error(`[GET_LOGS_ERROR] 유저ID:${user.id} | 사유:${err.message}`, err.stack);
      throw new InternalServerErrorException('로그 조회 중 문제가 발생했습니다.');
    }
  }

  async getMessageLogMetaData() {
    const raw = await this.messageLogRepository.query(`
      SELECT 'room_id' AS type, log.room_id AS value
      FROM message_log AS log
      GROUP BY log.room_id
  
      UNION ALL
  
      SELECT 'user_id' AS type, log.user_id AS value
      FROM message_log AS log
      GROUP BY log.user_id
  
      UNION ALL
  
      SELECT 'room_owner_id' AS type, log.room_owner_id AS value
      FROM message_log AS log
      GROUP BY log.room_owner_id;
    `);
  
    const result = {
      roomIds: [] as number[],
      userIds: [] as number[],
      roomOwnerIds: [] as number[],
    };
  
    for (const row of raw) {
      if (!row.value) continue;
  
      if (row.type === 'room_id') {
        result.roomIds.push(row.value);
      }
  
      if (row.type === 'user_id') {
        result.userIds.push(row.value);
      }
  
      if (row.type === 'room_owner_id') {
        result.roomOwnerIds.push(row.value);
      }
    }

    return result;
  }
}
