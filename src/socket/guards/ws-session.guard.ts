import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();

    if (!client.data?.user?.id) throw new WsException('인증 정보가 없습니다. 다시 연결해주세요.');

    return true;
  }
}