import { BadRequestException, Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {} // 서비스 클래스 자동 주입, 서비스의 메서드 호출 가능

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

    const { sessionId, user } = await this.authService.logIn(loginUserDto);

    console.log('테스트2',sessionId, user);

    res.cookie('SESSIONID', sessionId, {
      httpOnly: true,
      maxAge: 3600 * 1000 * 24,
      sameSite: 'lax'
    });
  
    return user; // 자동으로 200 코드 반환.
  }

  @Post('logout')
  async logOut(@Req() req: any, @Res() res: Response) {
    const sessionId = req.cookies['SESSIONID'];

    res.clearCookie('SESSIONID', {
      httpOnly: true,
      secure: true, // 배포 환경에서만 true
      sameSite: 'lax',
    });

    await this.authService.logOut(sessionId);
    
    return res.json({ message: '로그아웃' });
  }

  @Get('me')
  async getProfile(@Req() req: any) {
    const sessionId = req.cookies['SESSIONID'];
    if (!sessionId) throw new UnauthorizedException();
    return this.authService.getProfile(sessionId);
  }
}
