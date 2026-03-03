import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { SessionGuard } from './guards/session.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({ status: 201, description: '로그인 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async logIn(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true}) res: Response
  ) {
    const { sessionId, safeUser } = await this.authService.logIn(loginDto);

    res.cookie('SESSIONID', sessionId, {
      httpOnly: true,
      maxAge: 3600 * 1000 * 24,
      sameSite: 'lax'
    });
  
    return safeUser;
  }

  @ApiBearerAuth()
  @UseGuards(SessionGuard)
  @Post('logout')
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({ status: 201, description: '로그아웃 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
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
