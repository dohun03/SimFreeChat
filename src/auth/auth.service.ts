import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from 'src/redis/redis.service';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import { User } from 'src/users/users.entity';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AuthService {
  constructor( 
    @InjectRepository(User) 
    private userRepository: Repository<User>,
    private readonly redisService: RedisService,
  ) {}

  // 로그인 로직
  async logIn(loginUserDto: LoginUserDto): Promise<{ sessionId: string, safeUser: any }> {
    const { name, password } = loginUserDto;

    const user = await this.userRepository.findOne({ where: { name: name }});
    if (!user) throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');

    if (user.bannedUntil && user.bannedUntil > new Date()) {
      throw new ForbiddenException(`밴 사유: ${user.banReason}`);
    }

    const sessionId = uuid();
    await this.redisService.createSession(sessionId, { 
      userId: user.id,
      isAdmin: user.isAdmin,
    });

    const { password: removed, ...safeUser } = user;

    return { sessionId, safeUser };
  }

  // 로그아웃 로직
  async logOut(sessionId: string): Promise<void> {
    await this.redisService.deleteSession(sessionId);
  }
}
