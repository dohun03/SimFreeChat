import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './users.entity';
import * as bcrypt from 'bcrypt';
import { RedisService } from 'src/redis/redis.service';
import { ChatService } from 'src/chat/chat.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor( 
    @InjectRepository(User) 
    private userRepository: Repository<User>,
    private readonly redisService: RedisService,
    private readonly chatService: ChatService,
  ) {}

  //회원가입
  async createUser(createUserDto: CreateUserDto) {
    const { name, password, email } = createUserDto;
    const existingUser = await this.userRepository.findOne({
      where: [{ name }, { email }] // OR 조건문
    });
    if (existingUser) throw new BadRequestException('이미 존재하는 사용자명 또는 이메일입니다.');
  
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const newUser = this.userRepository.create({
      name,
      password: hashedPassword,
      email,
    });
  
    try {
      await this.userRepository.save(newUser);
    } catch (err) {
      console.error('DB 저장 에러:', err);
      throw new InternalServerErrorException('사용자 생성 중 문제가 발생했습니다.');
    }
  }

  // 본인 프로필 불러오기
  async getMyProfile(userId: number): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const { password, ...safeUser } = user;

    return safeUser;
  }

  // 특정 사용자 조회
  async getUserById(userId: number): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({
      where: {
        id: userId
      }
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const { password, ...safeUser } = user;
    
    return safeUser;
  }

  // 모든 사용자 조회 (관리자)
  async getAll(userId: number, search?: string): Promise<User[]> {
    const admin = await this.userRepository.findOne({
      where: { id: userId }
    });
    if (!admin?.isAdmin) throw new ForbiddenException('권한이 없습니다.');

    const where = search
    ? [
        { name: Like(`%${search}%`) },
        { email: Like(`%${search}%`) }
      ]
    : undefined;

    const users = await this.userRepository.find({
      where,
      select: ['id', 'name', 'email', 'isAdmin', 'createdAt', 'updatedAt']
    });
    if (!users) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    return users;
  }

  // 본인 프로필 수정하기
  async updateMyProfile(userId: number, updateUserDto: UpdateUserDto): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    // 닉네임 변경
    if (updateUserDto.name) {
      const existingUser = await this.userRepository.findOne({
        where: { name: updateUserDto.name },
      });
      if (existingUser) throw new BadRequestException('이미 존재하는 사용자명입니다.');

      user.name = updateUserDto.name;
    }

    // 비밀번호 변경
    if (updateUserDto.password) {
      const isSame = await bcrypt.compare(updateUserDto.password, user.password);
      if (isSame) throw new BadRequestException('이전과 동일한 비밀번호입니다.');

      user.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // 이메일 변경
    if (updateUserDto.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser) throw new BadRequestException('이미 사용 중인 이메일입니다.');

      user.email = updateUserDto.email;
    }

    try {
      await this.userRepository.save(user);
      const { password, ...safeUser } = user;
      return safeUser;
    } catch (err) {
      console.error('DB 저장 에러:', err);
      throw new InternalServerErrorException('사용자 수정 중 문제가 발생했습니다.');
    }
  }

  // 특정 사용자 프로필 수정하기 (관리자)
  async updateUserById(adminId: number, userId: number, updateUserDto: UpdateUserDto): Promise<Omit<User, 'password'>> {
    const admin = await this.userRepository.findOne({
      where: { id: adminId },
      select: ['id', 'isAdmin']
    });
    if (!admin?.isAdmin) throw new ForbiddenException('권한이 없습니다.');

    const user = await this.userRepository.findOne({
      where: { id: userId }
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    if (user.isAdmin) throw new ForbiddenException('관리자 정보는 수정할 수 없습니다.');

    if (updateUserDto.name) user.name = updateUserDto.name;

    if (updateUserDto.password) user.password = await bcrypt.hash(updateUserDto.password, 10);

    if (updateUserDto.email) user.email = updateUserDto.email;

    try {
      await this.userRepository.save(user);
      const { password, ...safeUser } = user;
      return safeUser;
    } catch (err) {
      console.error('DB 저장 에러:', err);
      throw new InternalServerErrorException('사용자 수정 중 문제가 발생했습니다.');
    }
  }

  // 특정 사용자 삭제하기 (관리자)
  async deleteUserById(adminId: number, userId: number): Promise<void> {
    const admin = await this.userRepository.findOne({
      where: { id: adminId },
      select: ['id', 'isAdmin']
    });
    if (!admin?.isAdmin) throw new ForbiddenException('권한이 없습니다.');

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'isAdmin']
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    if (user.isAdmin) throw new ForbiddenException('관리자 정보는 삭제할 수 없습니다.');
    try {
      await this.chatService.leaveAllRooms(userId);
      const result = await this.userRepository.delete({
        id: userId,
      });
  
      if (result.affected === 0) throw new BadRequestException('사용자가 존재하지 않거나 권한이 없습니다.');
    } catch (err) {
      console.error('DB 삭제 에러:', err);
      throw new InternalServerErrorException('사용자 삭제 중 문제가 발생했습니다.');
    }
  }
}
