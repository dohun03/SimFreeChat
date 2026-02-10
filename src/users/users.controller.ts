import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UnauthorizedException, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { SessionGuard } from 'src/auth/guards/session.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { BanUserDto } from './dto/ban-user.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  async create(@Body() createUserDto: CreateUserDto) {
    await this.usersService.createUser(createUserDto);
    return { message: "회원가입 성공" };
  }

  @UseGuards(SessionGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    const { sessionId, ...safeUser } = req.user;
    return safeUser;
  }

  @UseGuards(SessionGuard)
  @Patch('me')
  async updateMe(
    @Body() updateUserDto: UpdateUserDto, 
    @Req() req: any
  ) {
    return this.usersService.updateMyProfile(req.user.id, updateUserDto);
  }

  @UseGuards(SessionGuard)
  @Post('/:targetUserId/ban')
  async banUserById(
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @Body() banUserDto: BanUserDto,
    @Req() req: any
  ) {
    return await this.usersService.banUserById(req.user, targetUserId, banUserDto);
  }

  @UseGuards(SessionGuard)
  @Delete('/:targetUserId/ban')
  async unbanUserById(
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @Req() req: any
  ) {
    return this.usersService.unbanUserById(req.user, targetUserId);
  }

  @UseGuards(SessionGuard)
  @Get('/:userId')
  async getById(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: any
  ) {
    return this.usersService.getUserById(userId);
  }

  @UseGuards(SessionGuard)
  @Patch('/:targetUserId')
  async updateById(
    @Body() updateUserDto: UpdateUserDto,
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @Req() req: any
  ) {
    return this.usersService.updateUserById(req.user, targetUserId, updateUserDto);
  }

  @UseGuards(SessionGuard)
  @Delete('/:targetUserId')
  async deleteById(
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @Req() req: any
  ) {
    await this.usersService.deleteUserById(req.user, targetUserId);
    return { message: '삭제 되었습니다.' };
  }

  @UseGuards(SessionGuard)
  @Get()
  async getAll(
    @Req() req: any,
    @Query() query: any
  ) {
    return this.usersService.getAllUsers(req.user, query);
  }
}
