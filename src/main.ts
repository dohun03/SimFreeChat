import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';
import { BadRequestException, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });
  // dto 자동 검사 / 에러 메시지 반환
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
  app.use(express.static(join(__dirname, '..', 'public')));

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
