import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './users.entity';
import * as bcrypt from 'bcrypt';
import { RedisService } from 'src/redis/redis.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor( 
    @InjectRepository(User) 
    private userRepository: Repository<User>,
    private readonly redisService: RedisService,
  ) {}

  //회원가입
  async createUser(createUserDto: CreateUserDto) {
    const { username, password, email } = createUserDto;
    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }] // OR 조건문
    });
    if (existingUser) throw new BadRequestException('이미 존재하는 사용자명 또는 이메일입니다.');
  
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const newUser = this.userRepository.create({
      username,
      password: hashedPassword,
      email,
    });
  
    try {
      await this.userRepository.save(newUser);
    } catch (err) {
      console.error('DB 저장 에러:', err);
      throw new InternalServerErrorException('사용자 생성 중 문제가 발생했습니다.');
    }
  }

  // 본인 프로필 불러오기
  async getMyProfile(sessionId: string): Promise<Omit<User, 'password'>> {
    const session = await this.redisService.getSession(sessionId);
    if (!session) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    const user = await this.userRepository.findOne({
      where: { id: session.userId }
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const { password, ...safeUser } = user;

    return safeUser;
  }

  // 특정 사용자 조회
  async getUserById(userId: number) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId
      }
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const { password, ...safeUser } = user;
    
    return safeUser;
  }

  // 모든 사용자 조회 (관리자)
  async getAll(sessionId: string, search?: string) {
    const session = await this.redisService.getSession(sessionId);
    if (!session) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    const admin = await this.userRepository.findOne({
      where: { id: session.userId }
    });
    if (!admin?.is_admin) throw new UnauthorizedException('권한이 없습니다.');

    const where: any = new Object();

    if (search) {
      where.username = Like(`%${search}%`);
    }

    const users = await this.userRepository.find({
      where,
      select: ['id', 'username', 'email', 'is_admin', 'created_at', 'updated_at']
    });
    if (!users) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    return users;
  }

  // 본인 프로필 수정하기
  async updateMyProfile(sessionId: string, updateUserDto: UpdateUserDto) {
    const session = await this.redisService.getSession(sessionId);
    if (!session) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    const user = await this.userRepository.findOne({
      where: { id: session.userId }
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    // 닉네임 변경
    if (updateUserDto.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: updateUserDto.username },
      });
      if (existingUser) throw new BadRequestException('이미 존재하는 사용자명입니다.');

      user.username = updateUserDto.username;
    }

    // 비밀번호 변경
    if (updateUserDto.password) {
      const isSame = await bcrypt.compare(updateUserDto.password, user.password);
      if (isSame) throw new BadRequestException('이전과 동일한 비밀번호입니다.');

      user.password = await bcrypt.hash(updateUserDto.password, 10);
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
      await this.userRepository.save(user);
      const { password, ...safeUser } = user;
      return safeUser;
    } catch (err) {
      console.error('DB 저장 에러:', err);
      throw new InternalServerErrorException('사용자 수정 중 문제가 발생했습니다.');
    }
  }

  // 특정 사용자 프로필 수정하기 (관리자)
  async updateUserById(sessionId: string, userId: number, updateUserDto: UpdateUserDto) {
    const session = await this.redisService.getSession(sessionId);
    if (!session) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    const admin = await this.userRepository.findOne({
      where: { id: session.userId },
      select: ['id', 'is_admin']
    });
    if (!admin?.is_admin) throw new UnauthorizedException('권한이 없습니다.');

    const user = await this.userRepository.findOne({
      where: { id: userId }
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    if (user.is_admin) throw new UnauthorizedException('관리자 정보는 수정할 수 없습니다.');

    if (updateUserDto.username) user.username = updateUserDto.username;

    if (updateUserDto.password) user.password = await bcrypt.hash(updateUserDto.password, 10);

    if (updateUserDto.email) user.email = updateUserDto.email;

    try {
      await this.userRepository.save(user);
      const { password, ...safeUser } = user;
      return safeUser;
    } catch (err) {
      console.error('DB 저장 에러:', err);
      throw new InternalServerErrorException('사용자 수정 중 문제가 발생했습니다.');
    }
  }

  // 특정 사용자 삭제하기 (관리자)
  async deleteUserById(sessionId: string, userId: number) {
    const session = await this.redisService.getSession(sessionId);
    if (!session) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    const admin = await this.userRepository.findOne({
      where: { id: session.userId },
      select: ['id', 'is_admin']
    });
    if (!admin?.is_admin) throw new UnauthorizedException('권한이 없습니다.');

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'is_admin']
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    if (user.is_admin) throw new UnauthorizedException('관리자 정보는 삭제할 수 없습니다.');
    try {
      const result = await this.userRepository.delete({
        id: userId,
      });
  
      if (result.affected === 0) throw new BadRequestException('사용자가 존재하지 않거나 권한이 없습니다.');
    } catch (err) {
      console.error('DB 삭제 에러:', err);
      throw new InternalServerErrorException('사용자 삭제 중 문제가 발생했습니다.');
    }
  }
}
