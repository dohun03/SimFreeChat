import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UnauthorizedException, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { SessionGuard } from 'src/auth/guards/session.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { BanUserDto } from './dto/ban-user.dto';
import { SocketService } from 'src/socket/socket.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly socketService: SocketService,
  ) {}

  @Post('register')
  async create(@Body() createUserDto: CreateUserDto) {
    await this.usersService.createUser(createUserDto);
    return { message: "회원가입 성공" };
  }

  @UseGuards(SessionGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    return this.usersService.getMyProfile(req.user.userId);
  }

  @UseGuards(SessionGuard)
  @Patch('me')
  async updateMe(
    @Body() updateUserDto: UpdateUserDto, 
    @Req() req: any
  ) {
    return this.usersService.updateMyProfile(req.user.userId, updateUserDto);
  }

  @UseGuards(SessionGuard)
  @Post('/:userId/ban')
  async banUserById(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() banUserDto: BanUserDto,
    @Req() req: any
  ) {
    const result = await this.usersService.banUserById(req.user.userId, userId, banUserDto);
    await this.socketService.leaveAllRooms(userId);

    return result;
  }

  @UseGuards(SessionGuard)
  @Delete('/:userId/ban')
  async unbanUserById(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: any
  ) {
    return this.usersService.unbanUserById(req.user.userId, userId);
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
  @Patch('/:userId')
  async updateById(
    @Body() updateUserDto: UpdateUserDto,
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: any
  ) {
    return this.usersService.updateUserById(req.user.userId, userId, updateUserDto);
  }

  @UseGuards(SessionGuard)
  @Delete('/:userId')
  async deleteById(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: any
  ) {
    await this.usersService.deleteUserById(req.user.userId, userId);
    return { message: '삭제 되었습니다.' };
  }

  @UseGuards(SessionGuard)
  @Get()
  async getAll(
    @Req() req: any,
    @Query() query: any
  ) {
    return this.usersService.getAllUsers(req.user.userId, query);
  }
}
