import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Room } from 'src/rooms/rooms.entity';
import { User } from 'src/users/users.entity';
import { Repository, DataSource, Like } from 'typeorm';
import { ResponseMessageDto } from './dto/response-message.dto';
import { MessageLog } from './message-logs.entity';
import { Message, MessageType } from './messages.entity';
import { RedisService } from 'src/redis/redis.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GetAllMessageLogsQueryDto } from './dto/get-all-message-logs-query.dto';
import { GetRoomMessagesDto } from './dto/get-room-messages.dto';
import { RoomSummary } from './room-summary.entity';

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
    @InjectRepository(RoomSummary)
    private readonly roomSummaryRepository: Repository<RoomSummary>,
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

  // AI 요약용 메시지 포맷 메서드
  private formatMessagesForAi(messages: ResponseMessageDto[]): string {
    return messages
      .filter(msg => !msg.isDeleted && msg.type === 'text')
      .map(msg => {
        // 단순 자음/모음 반복 및 과도한 공백 제거
        const cleanContent = msg.content
          .replace(/[ㄱ-ㅎㅏ-ㅣ]{1,}/g, '')
          .replace(/[^a-zA-Z0-9가-힣\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        // 메시지당 50자 제한
        const truncated = cleanContent.length > 50 
          ? cleanContent.substring(0, 50) + '...' 
          : cleanContent;

        return `${msg.user.name}: ${truncated}`;
      })
      .filter(filterMsg => filterMsg.split(': ')[1].length > 0)
      .slice(-100) // 최근 100개로 제한하여 컨텍스트 최적화
      .join('\n');
  }

  async createMessage(
    roomId: number,
    userId: number,
    content: string,
    type: string
  ): Promise<{ message: ResponseMessageDto; lastMessageId?: string }> {
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
    
    try {
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
  
  // 방별 메시지 조회
  async getMessagesByRoom(roomId: number, query: GetRoomMessagesDto): Promise<ResponseMessageDto[]> {
    const { cursor, direction } = query;
    const limit = 100;

    // 캐시 메시지 반환
    if (!cursor) {
      const cachedMessages = await this.redisService.getRoomMessageCache(roomId);
      if (cachedMessages.length > 0) {
        return cachedMessages;
      }
    }

    // DB 메시지 반환
    const qb = this.messageRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'u')
      .select(['m', 'u.id', 'u.name', 'u.isAdmin'])
      .where('m.room_id = :roomId', { roomId });

    if (direction === 'before') {
      qb.andWhere('m.id < :cursor', { cursor }).orderBy('m.id', 'DESC');

      const messages = await qb.take(limit).getMany();

      return messages.reverse();
    }
    else if (direction === 'recent') {
      qb.andWhere('m.id > :cursor', { cursor }).orderBy('m.id', 'ASC');
    }

    const messages = await qb.take(limit).getMany();

    return messages;
  }

  // 방별 메시지 검색
  async searchMessages(roomId: number, keyword: string, cursorId?: string): Promise<ResponseMessageDto[]> {
    if (!keyword || keyword.trim().length < 2 || keyword.length > 20) return [];

    const LIMIT = 50;
    const trimmedKeyword = keyword.trim();

    const cachedMessages = await this.redisService.getRoomMessageCache(roomId);
    const redisResults = cachedMessages
    .filter(msg => {
      if (msg.isDeleted) return false;
      
      // 원문 포함 여부 확인 (특수문자/초성 모두 대응 가능)
      const isMatch = msg.content.includes(trimmedKeyword);
      const isWithinCursor = cursorId ? Number(msg.id) < Number(cursorId) : true;
      
      return isMatch && isWithinCursor;
    })
    .reverse();

    // 부족한 만큼 DB 추가 조회
    let finalResults = [...redisResults];
    const gap = LIMIT - finalResults.length;

    if (gap > 0) {
      const qb = this.messageRepository
        .createQueryBuilder('message')
        .leftJoinAndSelect('message.user', 'user')
        .select(['message', 'user.id', 'user.name', 'user.isAdmin'])
        .where('message.room_id = :roomId', { roomId })
        .andWhere('message.is_deleted = false')

      const hasSpecialChar = /[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s]/.test(trimmedKeyword);
    
      if (hasSpecialChar || trimmedKeyword.length < 3) {
        qb.andWhere('message.content LIKE :keyword', { keyword: `%${trimmedKeyword}%` });
      } else {
        qb.andWhere('MATCH(message.content) AGAINST(:keyword IN BOOLEAN MODE)', {
          keyword: `${trimmedKeyword}*`
        });
      }

      // 커서 조건 적용
      if (cursorId) {
        qb.andWhere('message.id < :cursorId', { cursorId });
      }

      // Redis 중복 값 DB 검색에서 제외
      const redisIds = redisResults.map(msg => msg.id);
      if (redisIds.length > 0) {
        qb.andWhere('message.id NOT IN (:...redisIds)', { redisIds });
      }

      const dbResults = await qb
        .orderBy('message.id', 'DESC')
        .take(gap)
        .getMany();

      // Redis + DB 결합
      finalResults = [...finalResults, ...dbResults];
    }

    return finalResults
      .sort((a, b) => Number(b.id) - Number(a.id))
      .slice(0, LIMIT);
  }

  // 방별 검색된 주변 메시지 조회
  async getSearchedMessageAround(roomId: number, targetId: string): Promise<ResponseMessageDto[]> {
    const limit = 50;

    const prevMessages = await this.messageRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'u')
      .select(['m', 'u.id', 'u.name', 'u.isAdmin'])
      .where('m.room_id = :roomId', { roomId })
      .andWhere('m.id < :targetId', { targetId })
      .orderBy('m.id', 'DESC')
      .take(limit)
      .getMany();

    const nextMessages = await this.messageRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'u')
      .select(['m', 'u.id', 'u.name', 'u.isAdmin'])
      .where('m.room_id = :roomId', { roomId })
      .andWhere('m.id >= :targetId', { targetId })
      .orderBy('m.id', 'ASC')
      .take(limit)
      .getMany();

    return [...prevMessages.reverse(), ...nextMessages];
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
    // 기존 요약 및 최신 캐시 메시지 로드
    const [lastSummary, cachedMessages] = await Promise.all([
      this.roomSummaryRepository.findOne({ where: { roomId } }),
      this.redisService.getRoomMessageCache(roomId),
    ]);

    if (!cachedMessages || cachedMessages.length < 30) {
      return { summary: "요약할 대화 내용이 없습니다.", isUpdated: false };
    }

    // 신규 메시지 개수 계산
    const latestId = cachedMessages[cachedMessages.length - 1].id;
    const gapCount = lastSummary 
      ? cachedMessages.filter(msg => msg.id > lastSummary.lastMessageId).length 
      : cachedMessages.length;

    // 업데이트가 불필요한 경우 (30개 미만)
    if (lastSummary && gapCount < 30) {
      return { summary: lastSummary.content, isUpdated: false };
    }

    const lockKey = `lock:summary:${roomId}`;
    const hasLock = await this.redisService.getLock(lockKey, 30);
    if (!hasLock) {
      return { 
        summary: lastSummary?.content || "다른 사용자가 대화를 요약 중입니다...", 
        isUpdated: false 
      };
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    let prompt = "";
    let summaryType = "";
    const formatInstruction = `
      출력 형식:
      # 주제 요약 (한 줄 핵심)
      # 주요 내용 (3~5개 불렛포인트)
      # 분위기 및 키워드
      
      ※ 주의: '결과입니다', '업데이트했습니다' 같은 불필요한 서두나 설명은 일절 배제하고 위 형식의 내용만 출력할 것.
    `;
    
    // 기존 요약 + 새 메시지 (30 ~ 100개 사이)
    if (lastSummary && gapCount <= 100) {
      summaryType = "MERGE_SUMMARY";
      const newMessages = cachedMessages.filter(msg => msg.id > lastSummary.lastMessageId);
      const context = this.formatMessagesForAi(newMessages);
      if (!context) return { summary: lastSummary?.content, isUpdated: false };
      
      prompt = `
        너는 전문 대화 요약가야.
        [기존 요약]의 내용을 참고하여, 새로 추가된 [최근 대화] 내용을 반영해 전체 요약을 업데이트해줘.
        기존의 흐름을 유지하면서 새로운 정보(결정사항, 바뀐 분위기 등)를 포함해야 해.
        요약 내용 길이는 300자 내외로 해줘.

        [기존 요약]: ${lastSummary.content}
        [최근 대화]: 
        ${context}
        
        ${formatInstruction}
      `;
    } 
    // 새로 요약 (101개 이상 또는 첫 요약)
    else {
      summaryType = "NEW_SUMMARY";
      const context = this.formatMessagesForAi(cachedMessages);
      if (!context) return { summary: lastSummary?.content, isUpdated: false };
      
      prompt = `
        너는 전문 대화 요약가야. 
        아래 [대화 내용]을 바탕으로 전체 내용을 요약해줘. 
        이전 맥락은 무시하고 현재 주어진 대화의 핵심만 정확하게 추출해라.
        요약 내용 길이는 300자 내외로 해줘.

        [대화 내용]:
        ${context}

        ${formatInstruction}
      `;
    }

    try {
      const result = await model.generateContent(prompt);
      const summaryText = result.response.text();

      // DB 업데이트
      await this.roomSummaryRepository.upsert({
        roomId,
        content: summaryText,
        lastMessageId: latestId,
      }, ['roomId']);

      this.logger.log(`[AI_SUMMARY] 방ID: ${roomId} | 유형: ${summaryType} | Gap: ${gapCount}`);
      
      return { summary: summaryText, isUpdated: true };

    } catch (err) {
      this.logger.error(`[AI_SUMMARY_FAILED] 방ID: ${roomId} | 사유: ${err.message}`);
      return { 
        summary: lastSummary?.content || "AI 요약 처리 중 오류가 발생했습니다.", 
        isUpdated: false 
      };
    } finally {
      await this.redisService.delLock(lockKey);
    }
  }

  async getAllMessageLogs(user: any, query: GetAllMessageLogsQueryDto): Promise<{ messageLogs: MessageLog[]; totalCount: number }> {
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

      const messageLogs = await dataQb.take(Number(line) || 100).getMany();

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