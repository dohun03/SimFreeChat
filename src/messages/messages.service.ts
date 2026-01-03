import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Room } from 'src/rooms/rooms.entity';
import { User } from 'src/users/users.entity';
import { Repository, DataSource } from 'typeorm';
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
    private readonly dataSource: DataSource,
  ) {}

  private userQueryCache: Map<number, { query: string; totalCount: number }> = new Map();

  checkQuery(userId: number, query: any): boolean {
    const newQuery = JSON.stringify(query);
    const cache = this.userQueryCache.get(userId);
    // 처음 조회하거나, 조건이 바뀐 경우 = count 실행 필요
    if (!cache || cache.query !== newQuery) {
      return true;
    }
  
    // 조건 동일 = count 필요 없음
    return false;
  }

  async createMessage(
    roomId: number,
    userId: number,
    content: string,
    type: string
  ): Promise<{ message: ResponseMessageDto; lastMessageId?: number }> {
    try {
      const [room, user] = await Promise.all([
        this.roomRepository.findOne({ 
          where: { id: roomId },
          select: ['id', 'name'],
          relations: ['owner']
        }),
        this.userRepository.findOne({ 
          where: { id: userId },
          select: ['id', 'name']
        }),
      ]);
      if (!room || !user) throw new NotFoundException('유효하지 않은 방 또는 유저입니다.');

      const lastMessage = await this.messageRepository.findOne({
        select: ['id'],
        where: { room: { id: roomId } },
        order: { id: 'DESC' },
      });

      const messageType: MessageType = type === 'image' ? MessageType.IMAGE : MessageType.TEXT;
      const messageAction = 'SEND';

      const msg = this.messageRepository.create({
        room: { id: roomId },
        user: { id: userId },
        content,
        type: messageType
      });
      const savedMsg = await this.messageRepository.save(msg);

      // 로그 저장은 병렬로 처리 (속도 이슈)
      this.messageLogRepository.insert({
        roomId: room.id,
        roomName: room.name,
        roomOwnerId: room.owner?.id,
        userId: user.id,
        userName: user.name,
        messageId: savedMsg.id,
        messageContent: savedMsg.content,
        type: messageType,
        action: messageAction,
      }).catch(err => console.error('로그 저장 실패:', err));

      return {
        message: { ...savedMsg, user },
        lastMessageId: lastMessage?.id,
      };
    } catch (err) {
      console.error('메시지 생성 중 에러:', err);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('메시지 전송 중 문제가 발생했습니다.');
    }
  }

  async deleteMessage(roomId: number, userId: number, messageId: number): Promise<number> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const message = await manager.findOne(Message, {
          where: {
            id: messageId,
            room: { id: roomId },
            user: { id: userId },
          },
          relations: ['room', 'room.owner', 'user'],
        });
        if (!message || message.isDeleted) {
          throw new BadRequestException('메시지를 삭제할 수 없습니다.');
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
          action: 'DELETE'
        });

        return message.id;
      });
    } catch (err) {
      console.error('메시지 삭제 실패:', err);
      throw new InternalServerErrorException('서버에서 메시지 삭제 중 오류가 발생했습니다.');
    }
  }

  async getMessagesByRoom(roomId: number, query: any): Promise<ResponseMessageDto[]> {
    const { search, cursor, direction } = query;
    const parsedCursor = cursor ? Number(cursor) : null;

    const qb = this.messageRepository
    .createQueryBuilder('m')
    .leftJoinAndSelect('m.user', 'u')
    .where('m.room_id = :roomId', { roomId })

    // 검색 조회
    if (search) {
      qb.andWhere(parsedCursor ? 'm.id >= :cursor' : '1=1', { cursor: parsedCursor })
      .andWhere('m.type = :type', { type: 'text' })
      .andWhere('m.content LIKE :search', { search: `%${search}%` })
      .orderBy('m.id', 'DESC');
    }
    // 일반 조회
    else {
      qb.limit(100);

      if (parsedCursor && direction === 'before') {
        qb.andWhere('m.id < :cursor', { cursor: parsedCursor })
        .orderBy('m.id', 'DESC');
      } else if (parsedCursor && direction === 'recent') {
        qb.andWhere('m.id > :cursor', { cursor: parsedCursor })
        .orderBy('m.id', 'ASC');
      } else {
        qb.orderBy('m.id', 'DESC');
      }
    }

    const messages = await qb.getMany();

    return messages.map((msg) => {
      const { password, ...safeUser } = msg.user;
      return {
        ...msg,
        user: safeUser
      }
    });
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
  
      // 캐시 여부 체크
      const needCount = this.checkQuery(userId, {
        search,
        searchType,
        startDate,
        endDate,
        messageType,
        actionType,
        roomIdType,
        roomOwnerIdType,
        userIdType,
      });
  
      let totalCount: any = 0;
  
      if (needCount) {
        const row = await countQb
          .select('COUNT(log.created_at)', 'totalCount')
          .getRawOne();

        totalCount = Number(row.totalCount);
  
        // 캐시에 저장
        this.userQueryCache.set(userId, {
          query: JSON.stringify({
            search,
            searchType,
            startDate,
            endDate,
            messageType,
            actionType,
            roomIdType,
            roomOwnerIdType,
            userIdType,
          }),
          totalCount,
        });
  
        console.log('count 실행 (조건 변경됨)');
      } else {
        // count 스킵 (캐시 totalCount 사용)
        totalCount = this.userQueryCache.get(userId)?.totalCount;
        console.log('count 스킵');
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
