import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const sessionId = req.cookies['SESSIONID'];

    if (!sessionId) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    const userId = await this.redisService.getUserIdBySession(sessionId);
    if (!userId) throw new UnauthorizedException('유효하지 않거나 만료된 세션입니다.');

    const userData = await this.redisService.getUserProfile(userId);
    if (!userData) throw new UnauthorizedException('유저 정보를 찾을 수 없습니다.');

    req.user = {
      ...userData,
      sessionId,
    };

    return true;
  }
}