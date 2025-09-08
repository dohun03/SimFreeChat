import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from 'src/redis/redis.service';
import { Room } from 'src/rooms/rooms.entity';
import { User } from 'src/users/users.entity';
import { Repository } from 'typeorm';
import { RoomUser } from './room-users.entity';

@Injectable()
export class RoomUsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(RoomUser)
    private roomUsersRepository: Repository<RoomUser>,
    private readonly redisService: RedisService
  ) {}

  // 방 참여
  async joinRoom(roomId: number, sessionId: string): Promise<RoomUser> {
    // 세션, 방, 유저 검증 후 저장
    const session = await this.redisService.getSession(sessionId);
    if (!session) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    const room = await this.roomRepository.findOne({ where: { id: roomId }});
    if (!room) throw new NotFoundException('방이 존재하지 않습니다.');

    const user = await this.userRepository.findOne({ where: { id: session.userId }});
    if (!user) throw new NotFoundException('사용자가 존재하지 않습니다.');

    const roomUserExists = await this.roomUsersRepository.findOne({
      where: {
        room: { id: room.id },
        user: { id: user.id }
      }
    });
    if (roomUserExists) throw new ConflictException('이미 참여한 방입니다.');

    const roomUser = this.roomUsersRepository.create({
      room,
      user,
    });
    return await this.roomUsersRepository.save(roomUser);
  }

  // 방 참여
  async leaveRoom(roomId: number, sessionId: string) {
    const session = await this.redisService.getSession(sessionId);
    if (!session) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    const room = await this.roomRepository.findOne({ where: { id: roomId }});
    if (!room) throw new NotFoundException('방이 존재하지 않습니다.');

    const user = await this.userRepository.findOne({ where: { id: session.userId }});
    if (!user) throw new NotFoundException('사용자가 존재하지 않습니다.');

    const result = await this.roomUsersRepository.delete({
      room,
      user,
    });

    if (!result.affected) throw new NotFoundException('참여 기록이 없습니다.');

    return { message: '방을 나갔습니다.' };
  }
}
