import { forwardRef, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';
import { SocketModule } from 'src/socket/socket.module';
import { SessionGuard } from './guards/session.guard';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [UsersModule, SocketModule, RedisModule],
  controllers: [AuthController],
  providers: [AuthService, SessionGuard],
  exports: [SessionGuard],
})
export class AuthModule {}
