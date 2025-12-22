import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정
  app.enableCors({
    origin: true, // 추 후 특정 도메인(서버 주소)만 허용
    credentials: true,
  });
  
  // 웹소켓 서버 설정
  app.useWebSocketAdapter(new IoAdapter(app));

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

  // [ Nginx 적용으로 정적파일 제공 코드 X ]
  // const server = app.getHttpAdapter().getInstance();
  // const publicPath = join(__dirname, '..', 'public');
  // const uploadPath = join(__dirname, '..', 'uploads');

  // /uploads 경로는 서버 uploads 폴더와 매핑
  // server.use('/uploads', express.static(uploadPath));

  // /api 경로 요청은 서버로, 나머지는 프론트에 index.html 제공
  // server.use(express.static(publicPath));
  // server.get(/^(?!\/api).*$/, (req, res) => {
  //   res.sendFile(join(publicPath, 'index.html'));
  // });

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();
