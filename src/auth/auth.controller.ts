import { BadRequestException, Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthService } from './auth.service';
import { SocketService } from 'src/socket/socket.service';
import { SessionGuard } from './guards/session.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly socketService: SocketService,
  ) {}

  @Post('login')
  async logIn(
    @Body() loginUserDto: LoginUserDto,
    @Res({ passthrough: true}) res: Response
  ) {
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
    await this.authService.logOut(req.user.id);

    res.clearCookie('SESSIONID', {
      httpOnly: true,
      sameSite: 'lax',
    });
    
    return { message: '로그아웃 완료' };
  }
}
