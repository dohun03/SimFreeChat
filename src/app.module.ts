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
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

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
        maxQueryExecutionTime: 500,
        logger: 'advanced-console',
        extra: {
          connectionLimit: 25,
          waitForConnections: true,
          queueLimit: 0,
          connectTimeout: 10000,
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'chat_limit',
            ttl: 10, // 10초, 10000ms
            limit: 10,  // 10회
            blockDuration: 1,
          },
        ],
        generateKey: (context) => {
          const client = context.switchToWs().getClient();
          const userId = client.data?.user?.id;
          // 소켓 연결 시 저장한 user객체의 ID를 키로 사용 (없으면 소켓 ID)
          return userId ? `throttle_user:${userId}` : `throttle_id:${client.id}`;
        },
        storage: new ThrottlerStorageRedisService({
          host: config.get<string>('REDIS_HOST') || 'localhost',
          port: config.get<number>('REDIS_PORT') || 6379,
        }),
      }),
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
