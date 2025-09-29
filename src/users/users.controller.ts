import { Body, Controller, Get, Patch, Post, Req, UnauthorizedException, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users') // 기본 /users 경로로 시작
export class UsersController {
  constructor(private readonly usersService: UsersService) {} // 서비스 클래스 자동 주입, 서비스의 메서드 호출 가능

  @Post('register')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(@Body() createUserDto: CreateUserDto) { // 요청 본문(JSON)을 CreateUserDto 타입으로 매핑
    await this.usersService.createUser(createUserDto);
    return { message: "회원가입 성공"};
  }

  @Get('me')
  async findMe(@Req() req: any) {
    const sessionId = req.cookies['SESSIONID'];
    if (!sessionId) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    return this.usersService.getMyProfile(sessionId);
  }

  @Patch('me')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  updateMe(
    @Body() updateUserDto: UpdateUserDto, 
    @Req() req: any
  ) {
    const sessionId = req.cookies['SESSIONID'];
    if (!sessionId) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    return this.usersService.updateMyProfile(sessionId, updateUserDto);
  }
}
