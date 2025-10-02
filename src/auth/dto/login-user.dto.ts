import { IsNotEmpty, IsString } from "class-validator";

export class LoginUserDto {
  @IsNotEmpty({ message: '아이디를 입력해주세요.' })
  @IsString()
  username: string;

  @IsNotEmpty({ message: '비밀번호를 입력해주세요.' })
  @IsString()
  password: string;
}