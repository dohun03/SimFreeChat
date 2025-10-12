import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  
    const existingUser = await this.userRepository.findOne({ where: { username } });
  
    if (existingUser) {
      throw new BadRequestException('이미 존재하는 사용자입니다.');
    }
  
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const newUser = this.userRepository.create({
      username,
      password: hashedPassword,
      email,
    });
  
    try {
      await this.userRepository.save(newUser);
    } catch (err) {
      console.error('DB 저장 중 에러 발생:', err);
      throw err;
    }
  }

  // 본인 프로필 불러오기
  async getMyProfile(sessionId: string): Promise<Omit<User, 'password'>> {
    const session = await this.redisService.getSession(sessionId);

    const user = await this.userRepository.findOne({
      where: { id: session.userId }
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const { password, ...safeUser } = user;

    return safeUser;
  }

  // 본인 프로필 수정하기
  async updateMyProfile(sessionId: string, updateUserDto: UpdateUserDto) {
    const session = await this.redisService.getSession(sessionId);

    const user = await this.userRepository.findOne({
      where: { id: session.userId }
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    // 닉네임 변경
    if (updateUserDto.username) {
      const existingUser = await this.userRepository.findOne({ where: { username: updateUserDto.username } });
      if (existingUser) throw new BadRequestException('이미 존재하는 사용자입니다.');

      user.username = updateUserDto.username;
    }

    // 비밀번호 변경
    if (updateUserDto.password) {
      const hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
      user.password = hashedPassword;
    }

    // 이메일 변경
    if (updateUserDto.email) {
      user.email = updateUserDto.email;
    }

    await this.userRepository.save(user);
    
    const { password, ...safeUser } = user;
    
    return safeUser;
  }
}
