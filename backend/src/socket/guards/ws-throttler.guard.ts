import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException, ThrottlerRequest } from '@nestjs/throttler';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger('WsThrottlerGuard');

  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, limit, ttl, throttler, getTracker, generateKey } = requestProps;
    const client = context.switchToWs().getClient();

    try {
      const tracker = await getTracker(context, client);
      const key = generateKey(context, tracker, throttler.name || 'default');

      // 1. 값 추출 (as any로 Resolvable/never 에러 방지)
      const rawLimit = limit as any;
      const rawTtl = ttl as any;
      const rawBlock = throttler.blockDuration as any;

      let resolvedLimit = typeof rawLimit === 'function' ? await rawLimit(context) : rawLimit;
      let resolvedTtl = typeof rawTtl === 'function' ? await rawTtl(context) : rawTtl;
      let resolvedBlock = typeof rawBlock === 'function' ? await rawBlock(context) : (rawBlock ?? 0);

      if (typeof resolvedLimit === 'object' && resolvedLimit !== null) resolvedLimit = resolvedLimit.limit;
      if (typeof resolvedTtl === 'object' && resolvedTtl !== null) resolvedTtl = resolvedTtl.ttl;

      const finalLimit = Math.floor(Number(resolvedLimit));
      const finalTtl = Math.max(1000, Math.floor(Number(resolvedTtl) * 1000));
      const finalBlockDuration = Math.max(1000, Math.floor(Number(resolvedBlock || 0) * 1000));

      const result = await this.storageService.increment(
        key,
        finalTtl,
        finalLimit,
        finalBlockDuration,
        throttler.name || 'default',
      );

      const hits = result.totalHits;
      if (hits > finalLimit) {
        throw new WsException('너무 빠르게 메시지를 보내고 있습니다.');
      }

      return true;

    } catch (error) {
      if (error instanceof WsException || error instanceof ThrottlerException) {
        throw error;
      }
      
      this.logger.error(`[WS_THROTTLE_ERROR] ${error.message}`);
      this.logger.error(error.stack);
      
      throw new WsException('서버 요청 제한 처리 중 오류가 발생했습니다.');
    }
  }
}