import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './users.entity';
import * as bcrypt from 'bcrypt';
import { RedisService } from 'src/redis/redis.service';
import { SocketService } from 'src/socket/socket.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { BCRYPT_SALT_ROUNDS } from 'src/common/constans';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor( 
    @InjectRepository(User) 
    private userRepository: Repository<User>,
    private readonly redisService: RedisService,
    private readonly socketService: SocketService,
  ) {}

  //회원가입
  async createUser(createUserDto: CreateUserDto) {
    const { name, password, email } = createUserDto;
    const existingUser = await this.userRepository.findOne({
      where: [{ name }, { email }] // OR 조건문
    });
    if (existingUser) throw new BadRequestException('이미 존재하는 사용자명 또는 이메일입니다.');
  
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  
    const newUser = this.userRepository.create({
      name,
      password: hashedPassword,
      email,
    });
  
    try {
      await this.userRepository.save(newUser);
    } catch (err) {
      this.logger.error(`[USER_CREATE_ERROR] 이메일:${email} | 사유:${err.message}`, err.stack);
      throw new InternalServerErrorException('사용자 생성 중 문제가 발생했습니다.');
    }
  }

  // 특정 사용자 조회 (DB조회)
  async getUserById(userId: number): Promise<Omit<User, 'password'>> {
    return await this.redisService.getUserProfile(userId);
  }

  async getAllUsers(admin: any, query: any) {
    if (!admin?.isAdmin) {
      this.logger.warn(`[USER_ADMIN_DENIED] 시도자ID:${admin.id} | 사유:관리자 권한 없음`);
      throw new ForbiddenException('권한이 없습니다.');
    }

    const { search, isAdmin, isBanned } = query;
    const limit = query.limit ? parseInt(query.limit) : 50;
    const offset = query.offset ? parseInt(query.offset) : 0;
    const now = new Date();
    const qb = this.userRepository.createQueryBuilder('u');

    if (search) {
      qb.andWhere('(u.name LIKE :search OR u.email LIKE :search)', { search: `%${search}%` });
    }

    if (isAdmin === 'true' || isAdmin === 'false') {
      qb.andWhere('u.isAdmin = :isAdmin', { isAdmin: isAdmin === 'true' });
    }

    if (isBanned === 'true') {
      qb.andWhere('u.bannedUntil > :now', { now });
    } else if (isBanned === 'false') {
      qb.andWhere('(u.bannedUntil IS NULL OR u.bannedUntil <= :now)', { now });
    }

    const totalCount = await qb.getCount();

    const users = await qb
      .orderBy('u.id', 'DESC')
      .skip(offset)
      .take(limit)
      .select(['u.id', 'u.name', 'u.email', 'u.isAdmin', 'u.bannedUntil', 'u.banReason', 'u.createdAt'])
      .getMany();

    return {
      users,
      totalCount,
    };
  }

  async updateMyProfile(userId: number, updateUserDto: UpdateUserDto): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    // 닉네임 변경
    if (updateUserDto.name) {
      const existingUser = await this.userRepository.findOne({
        where: { name: updateUserDto.name },
      });
      if (existingUser) throw new BadRequestException('이미 존재하는 사용자명입니다.');

      user.name = updateUserDto.name;
    }

    // 비밀번호 변경
    if (updateUserDto.password) {
      const isSame = await bcrypt.compare(updateUserDto.password, user.password);
      if (isSame) throw new BadRequestException('이전과 동일한 비밀번호입니다.');

      user.password = await bcrypt.hash(updateUserDto.password, BCRYPT_SALT_ROUNDS);
    }

    // 이메일 변경
    if (updateUserDto.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser) throw new BadRequestException('이미 사용 중인 이메일입니다.');

      user.email = updateUserDto.email;
    }

    try {
      const updatedUser = await this.userRepository.save(user);

      const { password, ...safeUser } = updatedUser;

      await this.redisService.setUserProfile(updatedUser.id, safeUser);

      return safeUser;

    } catch (err) {
      this.logger.error(`[USER_UPDATE_ERROR] 유저ID:${userId} | 사유:${err.message}`, err.stack);
      throw new InternalServerErrorException('사용자 수정 중 문제가 발생했습니다.');
    }
  }

  async updateUserById(admin: any, targetUserId: number, updateUserDto: UpdateUserDto): Promise<Omit<User, 'password'>> {
    if (!admin?.isAdmin) {
      this.logger.warn(`[USER_ADMIN_DENIED] 시도자ID:${admin.id} | 대상ID:${targetUserId} | 사유:관리자 권한 없음`);
      throw new ForbiddenException('권한이 없습니다.');
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId }
    });
    if (!targetUser) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    if (targetUser.isAdmin) throw new ForbiddenException('관리자 정보는 수정할 수 없습니다.');

    // 닉네임 변경
    if (updateUserDto.name) {
      const existingUser = await this.userRepository.findOne({
        where: { name: updateUserDto.name },
      });
      if (existingUser) throw new BadRequestException('이미 존재하는 사용자명입니다.');

      targetUser.name = updateUserDto.name;
    }

    // 비밀번호 변경
    if (updateUserDto.password) {
      const isSame = await bcrypt.compare(updateUserDto.password, targetUser.password);
      if (isSame) throw new BadRequestException('이전과 동일한 비밀번호입니다.');

      targetUser.password = await bcrypt.hash(updateUserDto.password, BCRYPT_SALT_ROUNDS);
    }

    // 이메일 변경
    if (updateUserDto.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser) throw new BadRequestException('이미 사용 중인 이메일입니다.');

      targetUser.email = updateUserDto.email;
    }

    try {
      const updatedUser = await this.userRepository.save(targetUser);

      const { password, ...safeUser } = updatedUser;

      await this.redisService.setUserProfile(updatedUser.id, safeUser);

      this.logger.warn(`[USER_ADMIN_UPDATE_SUCCESS] 관리자ID:${admin.id} | 대상ID:${targetUserId} | 항목:${Object.keys(updateUserDto).join(', ')}`);

      return safeUser;

    } catch (err) {
      this.logger.error(`[USER_ADMIN_UPDATE_ERROR] 관리자ID:${admin.id} | 대상ID:${targetUserId} | 사유:${err.message}`, err.stack);
      throw new InternalServerErrorException('사용자 수정 중 문제가 발생했습니다.');
    }
  }

  // 이것도 소프트 삭제 예정
  async deleteUserById(admin: any, targetUserId: number): Promise<void> {
    if (!admin?.isAdmin) {
      this.logger.warn(`[USER_ADMIN_DENIED] 시도자ID:${admin.id} | 대상ID:${targetUserId} | 사유:관리자 권한 없음`);
      throw new ForbiddenException('권한이 없습니다.');
    }

    const user = await this.redisService.getUserProfile(targetUserId);
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    if (user.isAdmin) throw new ForbiddenException('관리자 정보는 삭제할 수 없습니다.');
    
    try {
      await this.socketService.leaveAllRooms(targetUserId);
      
      const result = await this.userRepository.delete({
        id: targetUserId,
      });
      if (result.affected === 0) throw new BadRequestException('사용자가 존재하지 않거나 권한이 없습니다.');

      this.logger.warn(`[USER_ADMIN_DELETE_SUCCESS] 관리자ID:${admin.id} | 대상ID:${targetUserId}`);

    } catch (err) {
      this.logger.error(`[USER_ADMIN_DELETE_ERROR] 관리자ID:${admin.id} | 대상ID:${targetUserId} | 사유:${err.message}`, err.stack);
      throw new InternalServerErrorException('사용자 삭제 중 문제가 발생했습니다.');
    }
  }

  async banUserById(admin: any, targetUserId: number, data: { reason: string, banDays: number }) {
    if (!admin?.isAdmin) {
      this.logger.warn(`[USER_ADMIN_DENIED] 시도자ID:${admin.id} | 대상ID:${targetUserId} | 사유:관리자 권한 없음`);
      throw new ForbiddenException('권한이 없습니다.');
    }

    const targetUser = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundException('유저를 찾을 수 없습니다.');
    if (targetUser.isAdmin) throw new ForbiddenException('관리자는 밴 할 수 없습니다.');

    let bannedUntil: Date;

    if (data.banDays === 9999) {
      bannedUntil = new Date('2099-12-31T23:59:59');
    } else {
      bannedUntil = new Date();
      bannedUntil.setDate(bannedUntil.getDate() + data.banDays);
    }

    targetUser.bannedUntil = bannedUntil;
    targetUser.banReason = data.reason;

    try {
      const updatedUser = await this.userRepository.save(targetUser);

      const { password, ...safeUser } = updatedUser;

      await this.redisService.setUserProfile(targetUserId, safeUser);
      await this.socketService.leaveAllRooms(targetUserId);

      this.logger.warn(`[USER_ADMIN_BAN_SUCCESS] 관리자ID:${admin.id} | 대상ID:${targetUserId} | 기간:${data.banDays}일 | 사유:${data.reason}`);

      return { message: '밴 설정 완료' };

    } catch (err) {
      this.logger.error(`[USER_ADMIN_BAN_ERROR] 관리자ID:${admin.id} | 대상ID:${targetUserId} | 사유:${err.message}`, err.stack);
      throw new InternalServerErrorException('밴 처리 중 오류가 발생했습니다.');
    }
  }

  // 밴 해제 메서드 추가
  async unbanUserById(admin: any, targetUserId: number) {
    if (!admin?.isAdmin) {
      this.logger.warn(`[USER_ADMIN_DENIED] 시도자ID:${admin.id} | 대상ID:${targetUserId} | 사유:관리자 권한 없음`);
      throw new ForbiddenException('권한이 없습니다.');
    }

    const targetUser = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundException('유저를 찾을 수 없습니다.');

    targetUser.bannedUntil = null;
    targetUser.banReason = null;

    try {
      const updatedUser = await this.userRepository.save(targetUser);

      const { password, ...safeUser } = updatedUser;

      await this.redisService.setUserProfile(targetUserId, safeUser);

      this.logger.log(`[USER_ADMIN_UNBAN_SUCCESS] 관리자ID:${admin.id} | 대상ID:${targetUserId}`);
      return { message: '밴 해제 완료' };
      
    } catch (err) {
      this.logger.error(`[USER_ADMIN_UNBAN_ERROR] 관리자ID:${admin.id} | 대상ID:${targetUserId} | 사유:${err.message}`, err.stack);
      throw new InternalServerErrorException('밴 해제 중 오류가 발생했습니다.');
    }
  }
}
