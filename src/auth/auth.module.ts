import { forwardRef, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';
import { ChatModule } from 'src/chat/chat.module';
import { SessionGuard } from './guards/session.guard';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [UsersModule, ChatModule, RedisModule],
  controllers: [AuthController],
  providers: [AuthService, SessionGuard],
  exports: [SessionGuard],
})
export class AuthModule {}
