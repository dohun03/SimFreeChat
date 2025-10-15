import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UnauthorizedException, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async create(@Body() createUserDto: CreateUserDto) {
    await this.usersService.createUser(createUserDto);
    return { message: "회원가입 성공" };
  }

  @Get('me')
  async getMe(@Req() req: any) {
    const sessionId = req.cookies['SESSIONID'];
    if (!sessionId) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    return this.usersService.getMyProfile(sessionId);
  }

  @Get('')
  async getAll() {

  }

  @Get('/:userId')
  async getById(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: any
  ) {
    return this.usersService.getUserById(userId);
  }

  @Patch('me')
  updateMe(
    @Body() updateUserDto: UpdateUserDto, 
    @Req() req: any
  ) {
    const sessionId = req.cookies['SESSIONID'];
    if (!sessionId) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    return this.usersService.updateMyProfile(sessionId, updateUserDto);
  }
}
