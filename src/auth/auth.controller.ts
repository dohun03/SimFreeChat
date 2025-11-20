import { BadRequestException, Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthService } from './auth.service';
import { ChatService } from 'src/chat/chat.service';
import { SessionGuard } from './guards/session.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly chatService: ChatService,
  ) {}

  @Post('login')
  async logIn(
    @Body() loginUserDto: LoginUserDto,
    @Req() req: any,
    @Res({ passthrough: true}) res: Response
  ) {
    const existingSessionId = req.cookies['SESSIONID'];
    if(existingSessionId) {
      throw new BadRequestException('이미 로그인 되어있는 사용자입니다.');
    }

    const { sessionId, safeUser } = await this.authService.logIn(loginUserDto);

    res.cookie('SESSIONID', sessionId, {
      httpOnly: true,
      maxAge: 3600 * 1000 * 24,
      sameSite: 'lax'
    });
  
    return safeUser;
  }

  @UseGuards(SessionGuard)
  @Post('logout')
  async logOut(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.chatService.leaveAllRooms(req.user.userId);
    await this.authService.logOut(req.user.sessionId);

    res.clearCookie('SESSIONID', {
      httpOnly: true,
      sameSite: 'lax',
    });
    
    return { message: '로그아웃' };
  }
}
