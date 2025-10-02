import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsBoolean, IsInt, Min, Max, IsNotEmpty, Matches } from 'class-validator';

export class CreateRoomDto {
  @IsNotEmpty({ message: '방 제목을 입력해주세요.' })
  @IsString()
  @Matches(/^(?:[가-힣0-9 ]{2,12}|[a-zA-Z0-9 ]{2,12})$/, {
    message: '제목은 한글/숫자 조합(2~12자) 또는 영문/숫자 조합(2~12자)만 가능합니다.',
  })
  name: string;

  @IsInt({ message: '방 인원수를 숫자로 입력해주세요.' })
  @Min(2, { message: '최소 2명 이상을 입력해주세요.' })
  @Max(50, { message: '최대 50명까지 입력해주세요.' })
  maxMembers: number;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9!@#$%^&*(),.?":{}|<>]{4,16}$/, {
    message: '비밀번호는 4~16자의 영문 또는 숫자만 가능합니다.',
  })
  @Transform(({ value }) => value === '' ? undefined : value)
  // 옵셔널 처리를 위해 '' -> undefined
  password?: string;
}
