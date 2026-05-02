import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from 'src/redis/redis.service';
import { Room } from 'src/rooms/entities/rooms.entity';
import { Repository } from 'typeorm';
import { RoomUser, RoomUserStatus, RoomUserRole } from './entities/room-users.entity';
import { RestrictUserDto } from './dto/restric-user.dto';
import { SocketEvents } from 'src/socket/socket.events';

@Injectable()
export class RoomUsersService {
  private readonly logger = new Logger(RoomUsersService.name);
  constructor(
    private readonly redisService: RedisService,
    private readonly socketEvents: SocketEvents,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(RoomUser)
    private readonly roomUserRepository: Repository<RoomUser>,
  ) {}

  // [핵심] 권한 설정 (Manager 부여/해제)
  async updateRole(roomId: number, targetUserId: number, ownerId: number, role: RoomUserRole): Promise<void> {
    const room = await this.roomRepository.findOne({ where: { id: roomId }, relations: ['owner'] });
    if (!room || room.owner.id !== ownerId) throw new ForbiddenException('방장만 매니저를 임명할 수 있습니다.');
    if (targetUserId === ownerId) throw new BadRequestException('본인의 권한은 변경할 수 없습니다.');

    await this.roomUserRepository.upsert(
      { room: { id: roomId }, user: { id: targetUserId }, role: role },
      ['room', 'user']
    );
  }

  async restrictUser(roomId: number, targetUserId: number, dto: any, adminId: number) {
    const { status, days, reason } = dto;

    // 권한 조회
    const adminProfile = await this.redisService.getUserProfile(adminId);
    const adminInRoom = await this.roomUserRepository.findOne({
      where: { room: { id: roomId }, user: { id: adminId } }
    });

    // 권한 체크
    const hasAuthority = adminProfile.isAdmin || 
      (adminInRoom?.role === RoomUserRole.OWNER || adminInRoom?.role === RoomUserRole.MANAGER);

    if (!hasAuthority) {
      throw new ForbiddenException('제재 권한이 없습니다.');
    }

    if (targetUserId === adminId) {
      throw new BadRequestException('자기 자신은 제재할 수 없습니다.');
    }

    // 타겟 유저 조회
    const target = await this.roomUserRepository.findOne({ 
      where: { room: { id: roomId }, user: { id: targetUserId } } 
    });

    if (!target) throw new NotFoundException('해당 방에 유저가 존재하지 않습니다.');

    if (target.role !== RoomUserRole.MEMBER) {
      throw new ForbiddenException('관리자는 제재할 수 없습니다.');
    }

    // 4. 날짜 계산
    const restrictedUntil = days >= 9999 
      ? new Date('9999-12-31T23:59:59') 
      : new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // 5. DB 반영
    await this.roomUserRepository.update(target.id, {
      status,
      restrictedUntil,
      banReason: reason,
    });

    // 6. 소켓 알림
    this.socketEvents.restrictUser({
      roomId,
      targetUserId,
      status,
      reason,
      until: restrictedUntil,
    });

    return { success: true, status, until: restrictedUntil };
  }

  async unrestrictUser(roomId: number, targetUserId: number, adminId: number) {
    // 관리자 권한 체크 로직 (위와 동일하게 수행 권장)
    const admin = await this.roomUserRepository.findOne({ where: { room: { id: roomId }, user: { id: adminId } } });
    if (!admin || admin.role === RoomUserRole.MEMBER) throw new ForbiddenException('권한이 없습니다.');

    const target = await this.roomUserRepository.findOne({ where: { room: { id: roomId }, user: { id: targetUserId } } });
    if (!target) throw new NotFoundException('유저를 찾을 수 없습니다.');

    // 제재 필드 초기화
    await this.roomUserRepository.update(target.id, {
      status: RoomUserStatus.NORMAL,
      restrictedUntil: null,
      banReason: null,
    });

    // 해제 소켓 전파
    this.socketEvents.unrestrictUser({
      roomId,
      targetUserId
    });
    
    return { success: true, message: '제재가 해제되었습니다.' };
  }

  async getRoomUsers(roomId: number): Promise<RoomUser[]> {
  return this.roomUserRepository
    .createQueryBuilder('roomUser')
    .leftJoinAndSelect('roomUser.user', 'user')
    .where('roomUser.room = :roomId', { roomId })
    .select([
      'roomUser.id',
      'roomUser.role',
      'roomUser.status',
      'roomUser.banReason',
      'roomUser.restrictedUntil',
      'user.id',
      'user.name'
    ])
    .getMany();
  }
}