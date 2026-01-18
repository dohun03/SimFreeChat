import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
    
    // 최종 형태: [시간(13)][워커(2)][시퀀스(3)] -> 총 18자리 문자열
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
          select: ['id', 'name', 'isAdmin', 'isBanned', 'createdAt', 'updatedAt']
        }),
      ]);
      if (!room || !user) throw new NotFoundException('유효하지 않은 방 또는 유저입니다.');

      const lastMessageId = await this.redisService.getLastMessageId(roomId);
      
      const messageId = this.generateCustomId();
      const messageType: MessageType = type === 'image' ? MessageType.IMAGE : MessageType.TEXT;
      const messageAction = 'SEND';

      const message = {
        id: messageId,
        room: {
          id: room.id,
          name: room.name,
          owner: {
            id: room.owner.id,
          }
        },
        user: {
          id: user.id,
          name: user.name,
          isAdmin: user.isAdmin,
          isBanned: user.isBanned,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        content: content,
        type: messageType,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: null,
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

      return {
        message: { ...message, user },
        lastMessageId,
      };
    } catch (err) {
      console.error('메시지 생성 중 에러:', err);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('메시지 전송 중 문제가 발생했습니다.');
    }
  }

  async deleteMessage(roomId: number, userId: number, messageId: string): Promise<string> {
    // 어디에 있던 캐시 메시지는 삭제.
    await this.redisService.deleteCacheMessageByRoom(roomId, messageId);

    const message = await this.messageRepository.findOne({
      where: { id: messageId, room: { id: roomId }, user: { id: userId } },
      relations: ['room', 'room.owner', 'user'],
    });

    // DB에 메시지가 있음.
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
      });
    } else {
      await this.redisService.deleteMessageAndLog(roomId, userId, messageId);
    }
    console.log(`메시지 삭제 완료: ${messageId}`);
    return messageId;
  }
  
  async getMessagesByRoom(roomId: number, query: any): Promise<ResponseMessageDto[]> {
    const { cursor, direction } = query;
    const limit = 100;

    const qb = this.messageRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'u')
      .where('m.room_id = :roomId', { roomId });

    // DB 메시지 반환
    if (cursor) {
      if (direction === 'before') {
        qb.andWhere('m.id < :cursor', { cursor }).orderBy('m.id', 'DESC');
      }
      else if (direction === 'recent') {
        qb.andWhere('m.id > :cursor', { cursor }).orderBy('m.id', 'ASC');
      }
    }
    // 캐시 메시지 반환
    else {
      const cachedMessages = await this.redisService.getCacheMessagesByRoom(roomId);
      if (cachedMessages.length > 0) return cachedMessages;
    }

    const messages = await qb.limit(limit).getMany();
    
    const result = messages.map((msg) => {
      const { password, ...safeUser } = msg.user;
      return { ...msg, user: safeUser };
    });

    return direction === 'recent' ? result.reverse() : result;
  }
  
  async getAiMessagesSummary(roomId: number) {
    const cachedMessages = await this.redisService.getCacheMessagesByRoom(roomId);
    
    if (!cachedMessages || cachedMessages.length === 0) {
      return { summary: "요약할 대화 내용이 없습니다." };
    }

    // 데이터 포맷팅
    const chatContext = cachedMessages
      .filter(msg => !msg.isDeleted && msg.type === 'text')
      .reverse()
      .map(msg => `${msg.user.name}: ${msg.content}`)
      .join('\n');
    if (!chatContext) return { summary: "요약할 수 있는 텍스트 메시지가 없습니다." };

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel(
      { model: "gemini-3-flash-preview" }
    );

    // 프롬프트 작성 (데이터 주입)
    const prompt = `
      다음은 실시간 채팅방의 대화 내용이다. 
      사용자들의 대화를 분석해서 다음 형식으로 요약해줘:
      
      1. 주제 요약 (한 줄로 핵심만)
      2. 주요 대화 내용 (누가 어떤 말을 했는지 포함하여 3~5개 불렛포인트)
      3. 전체적인 분위기 (예: 즐거움, 화남, 평온함 등 한 단어)

      대화 내용:
      ${chatContext}
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const summaryText = response.text();

      return { summary: summaryText };
    } catch (error) {
      console.error(error);
      return { summary: "AI 요약 중 오류가 발생했습니다." };
    }
  }
  
  async getAllMessageLogs(
    userId: number,
    query: any
  ): Promise<{ messageLogs: MessageLog[]; totalCount: number }> {
    const admin = await this.userRepository.findOne({ where: { id: userId } });
    if (!admin?.isAdmin) throw new ForbiddenException('권한이 없습니다.');
  
    try {
      const {
        search,
        searchType,
        startDate,
        endDate,
        messageType,
        actionType,
        roomIdType,
        roomOwnerIdType,
        userIdType,
        line,
        cursor,
        direction,
      } = query;
  
      const rawQb = this.messageLogRepository.createQueryBuilder('log');
      const countQb = this.messageLogRepository.createQueryBuilder('log');

      if (direction === 'prev') {
        rawQb
          .andWhere('log.id > :cursor', { cursor })
          .orderBy('log.created_at', 'ASC')
          .addOrderBy('log.id', 'ASC');
      } else if (direction === 'next') {
        rawQb
          .andWhere('log.id < :cursor', { cursor })
          .orderBy('log.created_at', 'DESC')
          .addOrderBy('log.id', 'DESC');
      } else {
        rawQb
        .orderBy('log.created_at', 'DESC')
          .addOrderBy('log.id', 'DESC');
      }
  
      // 검색 조건
      if (search) {
        switch (searchType) {
          case 'message':
            rawQb.andWhere('log.message_content LIKE :search', {
              search: `%${search}%`,
            });
            countQb.andWhere('log.message_content LIKE :search', {
              search: `%${search}%`,
            });
            break;
  
          case 'user':
            rawQb.andWhere('log.user_name LIKE :search', {
              search: `%${search}%`,
            });
            countQb.andWhere('log.user_name LIKE :search', {
              search: `%${search}%`,
            });
            break;
  
          case 'room':
            rawQb.andWhere('log.room_name LIKE :search', {
              search: `%${search}%`,
            });
            countQb.andWhere('log.room_name LIKE :search', {
              search: `%${search}%`,
            });
            break;
  
          default:
            rawQb.andWhere(
              '(log.message_content LIKE :search OR log.user_name LIKE :search OR log.room_name LIKE :search)',
              { search: `%${search}%` },
            );
            countQb.andWhere(
              '(log.message_content LIKE :search OR log.user_name LIKE :search OR log.room_name LIKE :search)',
              { search: `%${search}%` },
            );
            break;
        }
      }
  
      // 날짜 조건
      if (startDate) {
        rawQb.andWhere('log.created_at >= :startDate', { startDate });
        countQb.andWhere('log.created_at >= :startDate', { startDate });
      }
      if (endDate) {
        rawQb.andWhere('log.created_at <= :endDate', {
          endDate: `${endDate} 23:59:59`,
        });
        countQb.andWhere('log.created_at <= :endDate', {
          endDate: `${endDate} 23:59:59`,
        });
      }

      // 메시지 타입 조건
      if (messageType) {
        rawQb.andWhere('log.type = :type', { type: messageType });
        countQb.andWhere('log.type = :type', { type: messageType });
      }
      
      // 액션 타입 조건
      if (actionType) {
        rawQb.andWhere('log.action = :action', { action: actionType });
        countQb.andWhere('log.action = :action', { action: actionType });
      }

      // 방 ID 조건
      if (roomIdType) {
        rawQb.andWhere('log.room_id = :roomId', { roomId: roomIdType });
        countQb.andWhere('log.room_id = :roomId', { roomId: roomIdType });
      }

      // 방장 ID 조건
      if (roomOwnerIdType) {
        rawQb.andWhere('log.room_owner_id = :roomOwnerId', { roomOwnerId: roomOwnerIdType });
        countQb.andWhere('log.room_owner_id = :roomOwnerId', { roomOwnerId: roomOwnerIdType });
      }
      
      // 사용자 ID 조건
      if (userIdType) {
        rawQb.andWhere('log.user_id = :userId', { userId: userIdType });
        countQb.andWhere('log.user_id = :userId', { userId: userIdType });
      }
  
      // raw 데이터 조회 (항상 실행)
      const messageLogs = await rawQb
        .limit(Number(line) || 100)
        .getMany();

      const currentQueryStr = JSON.stringify({
        search, searchType, startDate, endDate, messageType,
        actionType, roomIdType, roomOwnerIdType, userIdType,
      });

      const cachedData = await this.redisService.getUserQueryCache(userId);

      let totalCount: number;

      // 쿼리 조건 일치하는지 확인
      if (cachedData && cachedData.queryStr === currentQueryStr) {
        totalCount = cachedData.totalCount;
        console.log('DB Count를 스킵');
      } else {
        const row = await countQb
          .select('COUNT(log.created_at)', 'totalCount')
          .getRawOne();
        
        totalCount = Number(row.totalCount);

        await this.redisService.setUserQueryCache(userId, currentQueryStr, totalCount);
        console.log('DB Count를 실행');
      }

      return { messageLogs, totalCount };
    } catch (err) {
      console.error('메시지 로그 조회 중 오류 발생:', err);
      throw new InternalServerErrorException(
        '메시지 로그 조회 중 문제가 발생했습니다.',
      );
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
