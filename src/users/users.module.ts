import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './users.entity';
import { RedisModule } from '@nestjs-modules/ioredis';
import { SocketModule } from 'src/socket/socket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    RedisModule,
    SocketModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}