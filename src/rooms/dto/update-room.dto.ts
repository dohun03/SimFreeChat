import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsBoolean, IsInt, Min, Max, IsNotEmpty, Matches } from 'class-validator';

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @Matches(/^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9 _!@#$%^&*()\-+=~]{2,30}$/, {
    message: '제목은 2~30자 이내의 한글, 자모, 영문, 숫자 및 일부 특수문자만 사용할 수 있습니다.',
  })
  name?: string;

  @IsOptional()
  @IsInt({ message: '방 인원수를 숫자로 입력해주세요.' })
  @Min(2, { message: '최소 2명 이상을 입력해주세요.' })
  @Max(50, { message: '최대 50명까지 입력해주세요.' })
  maxMembers?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9!@#$%^&*(),.?":{}|<>]{4,16}$/, {
    message: '비밀번호는 4~16자의 영문 또는 숫자만 가능합니다.',
  })
  @Transform(({ value }) => value === '' ? undefined : value)
  // 옵셔널 처리를 위해 '' -> undefined
  password?: string;
}
