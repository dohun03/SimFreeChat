import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';
import { BadRequestException, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

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

  const server = app.getHttpAdapter().getInstance();
  const publicPath = join(__dirname, '..', 'public');
  
  // /api 경로 요청은 서버로, 나머지는 프론트에 index.html 제공
  server.use(express.static(publicPath));
  server.get(/^(?!\/api).*$/, (req, res) => {
    res.sendFile(join(publicPath, 'index.html'));
  });

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
