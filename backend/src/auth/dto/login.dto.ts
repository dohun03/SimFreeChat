import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ 
    description: '유저 아이디', 
    example: 'user123',
    required: true 
  })
  @IsNotEmpty({ message: '아이디를 입력해주세요.' })
  @IsString()
  name: string;

  @ApiProperty({ 
    description: '유저 비밀번호', 
    example: 'password123!',
    required: true,
    format: 'password'
  })
  @IsNotEmpty({ message: '비밀번호를 입력해주세요.' })
  @IsString()
  password: string;
}