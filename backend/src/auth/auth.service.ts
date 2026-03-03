import { ForbiddenException, Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SocketService } from 'src/socket/socket.service';
import { RedisService } from 'src/redis/redis.service';
import { LoginDto } from './dto/login.dto';
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
    private readonly socketService: SocketService,
  ) {}

  async logIn(loginDto: LoginDto): Promise<{ sessionId: string, safeUser: any }> {
    const { name, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { name: name },
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
      await this.socketService.leaveAllRooms(user.id);

      const sessionId = uuid();
      const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        bannedUntil: user.bannedUntil,
        banReason: user.banReason,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      await this.redisService.setLoginUserData(sessionId, user.id, safeUser);

      return { sessionId, safeUser };
      
    } catch (err) {
      this.logger.error(`[AUTH_LOGIN_ERROR] 유저ID:${user.id} | 사유:${err.message}`, err.stack);
      throw new InternalServerErrorException('로그인 처리 중 서버 오류가 발생했습니다.');
    }
  }

  async logOut(userId: number): Promise<void> {
    try {
      if (userId) {
        await this.socketService.leaveAllRooms(userId);
      }
    } catch (err) {
      this.logger.error(`[AUTH_LOGOUT_ERROR] 유저ID:${userId} | 사유:${err.message}`);
    }
  }
}
