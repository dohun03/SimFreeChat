import { IsString, Matches, IsEmail, Length, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: '아이디를 입력해주세요.' })
  @IsString()
  @Matches(/^(?:[가-힣]{2,12}|[a-zA-Z0-9]{2,12})$/, {
    message: '아이디는 한글(2~12자) 또는 영문/숫자 조합(2~12자)만 가능합니다.',
  })
  name: string;

  @IsNotEmpty({ message: '비밀번호를 입력해주세요.' })
  @IsString()
  @Matches(/^[a-zA-Z0-9!@#$%^&*(),.?":{}|<>]{4,16}$/, {
    message: '비밀번호는 4~16자의 영문 또는 숫자만 가능합니다.',
  })
  password: string;

  @IsNotEmpty({ message: '이메일을 입력해주세요.' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email: string;
}