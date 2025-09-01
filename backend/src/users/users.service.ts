import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './users.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor( 
    @InjectRepository(User) 
    private userRepository: Repository<User>,
  ) {}

  //회원가입
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const { username, password, email } = createUserDto;
  
    const existingUser = await this.userRepository.findOne({ where: { username } });
  
    if (existingUser) {
      throw new BadRequestException('이미 존재하는 사용자입니다.');
    }
  
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const newUser = this.userRepository.create({
      username,
      password: hashedPassword,
      email,
    });
  
    try {
      const savedUser = await this.userRepository.save(newUser);
      console.log('DB 저장 완료:', savedUser);
      return savedUser;
    } catch (err) {
      console.error('DB 저장 중 에러 발생:', err);
      throw err;
    }
  }
  
}
