import { BadRequestException, Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthService } from './auth.service';
import { ChatService } from 'src/chat/chat.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly chatService: ChatService
  ) {} // 서비스 클래스 자동 주입, 서비스의 메서드 호출 가능

  @Post('login')
  async logIn(
    @Body() loginUserDto: LoginUserDto,
    @Req() req: any,
    @Res({ passthrough: true}) res: Response
  ) { // CreateUserDto 타입으로 매핑
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
  
    return safeUser; // 자동으로 200 코드 반환.
  }

  @Post('logout')
  async logOut(@Req() req: any, @Res() res: Response) {
    const sessionId = req.cookies['SESSIONID'];
    if (!sessionId) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    await this.chatService.leaveAllRooms(sessionId);
    await this.authService.logOut(sessionId);

    res.clearCookie('SESSIONID', {
      httpOnly: true,
      sameSite: 'lax',
    });
    
    return res.json({ message: '로그아웃' });
  }
}
