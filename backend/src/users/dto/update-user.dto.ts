import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Matches, IsEmail, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ 
    description: '수정할 이름', 
    example: '임꺽정' 
  })
  @IsOptional()
  @IsString()
  @Matches(/^(?:[가-힣]{2,12}|[a-zA-Z0-9]{2,12})$/, {
    message: '아이디는 한글(2~12자) 또는 영문/숫자 조합(2~12자)만 가능합니다.',
  })
  name?: string;

  @ApiPropertyOptional({ 
    description: '수정할 비밀번호', 
    example: 'newpass1234' 
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9!@#$%^&*(),.?":{}|<>]{4,16}$/, {
    message: '비밀번호는 4~16자의 영문, 숫자, 특수문자만 가능합니다.',
  })
  password?: string;

  @ApiPropertyOptional({ 
    description: '수정할 이메일', 
    example: 'new@example.com' 
  })
  @IsOptional()
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email?: string;
}