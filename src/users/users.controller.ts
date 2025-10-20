import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UnauthorizedException, UsePipes, ValidationPipe } from '@nestjs/common';
import { ChatService } from 'src/chat/chat.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly chatService: ChatService,
  ) {}

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

  @Get('/:userId')
  async getById(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: any
  ) {
    const sessionId = req.cookies['SESSIONID'];
    if (!sessionId) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    return this.usersService.getUserById(userId);
  }

  @Get()
  async getAll(
    @Req() req: any,
    @Query('search') search?: string
  ) {
    const sessionId = req.cookies['SESSIONID'];
    if (!sessionId) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    return this.usersService.getAll(sessionId, search);
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

  @Patch('/:userId')
  updateById(
    @Body() updateUserDto: UpdateUserDto,
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: any
  ) {
    const sessionId = req.cookies['SESSIONID'];
    if (!sessionId) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    return this.usersService.updateUserById(sessionId, userId, updateUserDto);
  }

  @Delete('/:userId')
  async deleteById(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: any
  ) {
    const sessionId = req.cookies['SESSIONID'];
    if (!sessionId) throw new UnauthorizedException('세션이 존재하지 않습니다.');

    await this.usersService.deleteUserById(sessionId, userId);
    await this.chatService.leaveAllRooms(userId);
    
    return { message: '삭제 되었습니다.' };
  }
}
