import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users') // 기본 /users 경로로 시작
export class UsersController {
  constructor(private readonly usersService: UsersService) {} // 서비스 클래스 자동 주입, 서비스의 메서드 호출 가능

  @Post('register')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async register(@Body() createUserDto: CreateUserDto) { // 요청 본문(JSON)을 CreateUserDto 타입으로 매핑
    return this.usersService.createUser(createUserDto);
  }
}
