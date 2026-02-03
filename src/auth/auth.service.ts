import { ForbiddenException, Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from 'src/redis/redis.service';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import { User } from 'src/users/users.entity';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor( 
    @InjectRepository(User) 
    private userRepository: Repository<User>,
    private readonly redisService: RedisService,
  ) {}

  async logIn(loginUserDto: LoginUserDto): Promise<{ sessionId: string, safeUser: any }> {
    const { name, password } = loginUserDto;

    const user = await this.userRepository.findOne({
      where: { name: name },
      select: ['id', 'name', 'password', 'isAdmin', 'bannedUntil', 'banReason'],
    });
    
    if (!user) {
      this.logger.warn(`[AUTH_LOGIN_DENIED] 계정명:${name} | 사유:존재하지 않는 계정`);
      throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`[AUTH_LOGIN_DENIED] 계정명:${name} | 유저ID:${user.id} | 사유:비밀번호 불일치`);
      throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
    }

    if (user.bannedUntil && user.bannedUntil > new Date()) {
      this.logger.warn(`[AUTH_LOGIN_DENIED] 유저ID:${user.id} | 사유:밴 상태 | 사유내용:${user.banReason}`);
      throw new ForbiddenException(`밴 사유: ${user.banReason}`);
    }

    try {
      const sessionId = uuid();
      await this.redisService.createSession(sessionId, { 
        userId: user.id,
        userName: user.name,
        isAdmin: user.isAdmin,
      });

      return { 
        sessionId, 
        safeUser: {
          id: user.id,
          name: user.name,
          isAdmin: user.isAdmin,
          bannedUntil: user.bannedUntil,
          banReason: user.banReason,
        } 
      };
      
    } catch (err) {
      this.logger.error(`[AUTH_SESSION_ERROR] 유저ID:${user.id} | 사유:${err.message}`, err.stack);
      throw new InternalServerErrorException('로그인 처리 중 서버 오류가 발생했습니다.');
    }
  }

  async logOut(sessionId: string): Promise<void> {
    try {
      if (sessionId) {
        await this.redisService.deleteSession(sessionId);
      }
    } catch (err) {
      this.logger.error(`[AUTH_LOGOUT_ERROR] 세션ID:${sessionId} | 사유:${err.message}`);
    }
  }
}
