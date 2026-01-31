import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './common/configs/logger.config';
import { AppModule } from './app.module';
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { RedisIoAdapter } from './redis/redis-io.adapter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

  // CORS 설정
  app.enableCors({
    origin: process.env.SERVER_URL,
    credentials: true,
  });
  
  // 웹소켓 서버 설정
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // DTO 자동 검사
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const messages = errors
          .map(err => err.constraints ? Object.values(err.constraints) : [])
          .flat();

        const validationLogger = new Logger('ValidationError');
        validationLogger.warn(`DTO 검증 실패: ${JSON.stringify(messages)}`);

        return new BadRequestException(messages);
      },
    }),
  );

  app.use(cookieParser());

  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');

  logger.log(`Server is running on port ${process.env.PORT ?? 4000}`);
}
bootstrap();
