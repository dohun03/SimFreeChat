import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { SessionGuard } from 'src/auth/guards/session.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { GetAllUsersQueryDto } from './dto/get-all-users-query.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 회원가입
  @Post('register')
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({ status: 201, description: '가입 성공' })
  @ApiResponse({ status: 400, description: '이미 존재하는 사용자명 또는 이메일입니다.' })
  async create(@Body() createUserDto: CreateUserDto) {
    await this.usersService.createUser(createUserDto);
    return { message: "회원가입 성공" };
  }

  // 내 프로필 조회
  @UseGuards(SessionGuard)
  @Get('me')
  @ApiOperation({ summary: '내 프로필 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 401, description: '로그인 필요' })
  async getMe(@Req() req: any) {
    return this.usersService.getUserById(req.user.id);
  }

  // 내 프로필 수정
  @UseGuards(SessionGuard)
  @Patch('me')
  @ApiOperation({ summary: '내 프로필 수정' })
  @ApiResponse({ status: 200, description: '수정 성공' })
  @ApiResponse({ status: 400, description: '중복된 정보이거나 비밀번호가 동일합니다.' })
  @ApiResponse({ status: 401, description: '로그인 필요' })
  async updateMe(@Body() updateUserDto: UpdateUserDto, @Req() req: any) {
    return this.usersService.updateMyProfile(req.user.id, updateUserDto);
  }

  // 유저 차단 (관리자)
  @UseGuards(SessionGuard)
  @Post('/:targetUserId/ban')
  @ApiOperation({ summary: '유저 차단 (관리자)' })
  @ApiParam({ name: 'targetUserId', type: Number })
  @ApiResponse({ status: 201, description: '차단 성공' })
  @ApiResponse({ status: 403, description: '권한이 없거나 관리자입니다.' })
  async banUserById(
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @Body() banUserDto: BanUserDto,
    @Req() req: any
  ) {
    return await this.usersService.banUserById(req.user, targetUserId, banUserDto);
  }

  // 유저 차단 해제 (관리자)
  @UseGuards(SessionGuard)
  @Delete('/:targetUserId/ban')
  @ApiOperation({ summary: '유저 차단 해제 (관리자)' })
  @ApiParam({ name: 'targetUserId', type: Number })
  @ApiResponse({ status: 200, description: '해제 성공' })
  @ApiResponse({ status: 403, description: '권한이 없습니다.' })
  async unbanUserById(@Param('targetUserId', ParseIntPipe) targetUserId: number, @Req() req: any) {
    return this.usersService.unbanUserById(req.user, targetUserId);
  }

  // 유저 전체 조회 (관리자)
  @UseGuards(SessionGuard)
  @Get()
  @ApiOperation({ summary: '유저 전체 목록 조회 및 검색 (관리자)' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 403, description: '권한이 없습니다.' })
  async getAll(@Req() req: any, @Query() query: GetAllUsersQueryDto) {
    return this.usersService.getAllUsers(req.user, query);
  }

  // 유저 조회
  @UseGuards(SessionGuard)
  @Get('/:userId')
  @ApiOperation({ summary: '유저 정보 조회' })
  @ApiParam({ name: 'userId', type: Number })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없습니다.' })
  async getById(@Param('userId', ParseIntPipe) userId: number) {
    return this.usersService.getUserById(userId);
  }

  // 유저 정보 수정 (관리자)
  @UseGuards(SessionGuard)
  @Patch('/:targetUserId')
  @ApiOperation({ summary: '유저 정보 수정 (관리자)' })
  @ApiParam({ name: 'targetUserId', type: Number })
  @ApiResponse({ status: 200, description: '수정 성공' })
  @ApiResponse({ status: 403, description: '권한이 없습니다.' })
  async updateById(
    @Body() updateUserDto: UpdateUserDto,
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @Req() req: any
  ) {
    return this.usersService.updateUserById(req.user, targetUserId, updateUserDto);
  }

  // 유저 삭제 (관리자)
  @UseGuards(SessionGuard)
  @Delete('/:targetUserId')
  @ApiOperation({ summary: '유저 삭제 (관리자)' })
  @ApiParam({ name: 'targetUserId', type: Number })
  @ApiResponse({ status: 200, description: '삭제 완료' })
  @ApiResponse({ status: 403, description: '권한이 없습니다.' })
  async deleteById(@Param('targetUserId', ParseIntPipe) targetUserId: number, @Req() req: any) {
    await this.usersService.deleteUserById(req.user, targetUserId);
    return { message: '삭제 되었습니다.' };
  }
}