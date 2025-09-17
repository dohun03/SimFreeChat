import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { RoomsModule } from './rooms/rooms.module';
import { RoomUsersModule } from './room-users/room-users.module';
import { MessagesModule } from './messages/messages.module';
import { AuthModule } from './auth/auth.module';
import { RedisGlobalModule } from './redis/redis.module';
import { ChatModule } from './chat/chat.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',   // DB 계정
      password: '0000', // DB 비밀번호
      database: 'chat',     // 생성한 DB
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,       // dev용: 테이블 자동 생성
    }),
    EventEmitterModule.forRoot(),
    UsersModule,
    RoomsModule,
    RoomUsersModule,
    MessagesModule,
    AuthModule,
    RedisGlobalModule,
    ChatModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}