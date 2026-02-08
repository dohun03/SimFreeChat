import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const sessionId = req.cookies['SESSIONID'];

    if (!sessionId) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    const session = await this.redisService.getUserSession(sessionId);

    if (!session) throw new UnauthorizedException('유효하지 않은 세션입니다.');

    req.user = {
      userId: session.userId,
      sessionId: sessionId,
    };

    return true;
  }
}
