import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { RedisIoAdapter } from './redis/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정
  app.enableCors({
    origin: true, // 추 후 특정 도메인(서버 주소)만 허용
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
        return new BadRequestException(messages);
      },
    }),
  );

  app.use(cookieParser());

  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');

  console.log(`server is running 22 ${process.env.SOCKET_ORIGIN}`);
}
bootstrap();
