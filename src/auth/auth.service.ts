import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Req, UnauthorizedException } from '@nestjs/common';
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
  async logIn(loginUserDto: LoginUserDto) {
    const { name, password } = loginUserDto;

    const user = await this.userRepository.findOne({ where: { name: name }});
    if (!user) throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');

    if (user.is_banned) throw new ForbiddenException('차단 되어있는 사용자입니다.');

    const sessionId = uuid();
    await this.redisService.createSession(sessionId, { 
      userId: user.id,
      isAdmin: user.is_admin,
    });

    const { password: removed, ...safeUser } = user;

    return { sessionId, safeUser };
  }

  // 로그아웃 로직
  async logOut(sessionId: string) {
    const session = await this.redisService.getSession(sessionId);
    if (!session) throw new BadRequestException('로그인 되어있지 않은 사용자입니다.');

    await this.redisService.deleteSession(sessionId);
  }
}
