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
import { ChatModule } from './chat/chat.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RoomUsersModule } from './room-users/room-users.module';
import { UploadsModule } from './uploads/uploads.module';
import { Logger, QueryRunner } from 'typeorm';

@Module({
  imports: [
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
        logging: true,
        maxQueryExecutionTime: 1,
        logger: new class implements Logger {
          logQuery() {}
          logQueryError() {}
          
          logQuerySlow(time: number, query: string) {
            const tableMatch =
              query.match(/from\s+`?(\w+)`?/i) ||
              query.match(/into\s+`?(\w+)`?/i) ||
              query.match(/update\s+`?(\w+)`?/i);
        
            const tableName = tableMatch ? tableMatch[1] : 'unknown';
        
            console.log(`[QUERY] ${tableName} (${time} ms)`);
          }
        
          logSchemaBuild() {}
          logMigration() {}
          log() {}
        }
      }),
      inject: [ConfigService],
    }),

    EventEmitterModule.forRoot(),
    UsersModule,
    RoomsModule,
    MessagesModule,
    AuthModule,
    RedisGlobalModule,
    ChatModule,
    RoomUsersModule,
    UploadsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
