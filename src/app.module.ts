import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { RoomsModule } from './rooms/rooms.module';
import { MessagesModule } from './messages/messages.module';
import { AuthModule } from './auth/auth.module';
import { RedisGlobalModule } from './redis/redis.module';
import { SocketModule } from './socket/socket.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RoomUsersModule } from './room-users/room-users.module';
import { UploadsModule } from './uploads/uploads.module';
import { Logger, QueryRunner } from 'typeorm';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true, // 전역에서 사용 가능
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASS'),
        database: config.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: ['error', 'warn'],
        maxQueryExecutionTime: 100,
        logger: 'advanced-console',
        extra: {
          connectionLimit: 10,
          waitForConnections: true,
          queueLimit: 0,
          connectTimeout: 10000,
        },
      }),
      inject: [ConfigService],
    }),
    EventEmitterModule.forRoot(),
    UsersModule,
    RoomsModule,
    MessagesModule,
    AuthModule,
    RedisGlobalModule,
    SocketModule,
    RoomUsersModule,
    UploadsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
