import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsInt, Min, Max, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoomDto {
  @ApiProperty({ 
    description: '방 제목 (2~30자, 한글/영문/숫자/특수문자)', 
    example: '즐거운 채팅방',
    required: false 
  })
  @IsOptional()
  @IsString()
  @Matches(/^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9 _!@#$%^&*()\-+=~]{2,30}$/, {
    message: '제목은 2~30자 이내의 한글, 자모, 영문, 숫자 및 일부 특수문자만 사용할 수 있습니다.',
  })
  name?: string;

  @ApiProperty({
    description: '최대 인원 (2~50명)',
    example: 10,
    required: false
  })
  @IsOptional()
  @IsInt({ message: '방 인원수를 숫자로 입력해주세요.' })
  @Min(2, { message: '최소 2명 이상을 입력해주세요.' })
  @Max(50, { message: '최대 50명까지 입력해주세요.' })
  maxMembers?: number;

  @ApiProperty({ 
    description: '비밀번호 (4~16자, 영문/숫자/특수문자)', 
    example: 'pass1234',
    required: false 
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9!@#$%^&*(),.?":{}|<>]{4,16}$/, {
    message: '비밀번호는 4~16자의 영문 또는 숫자만 가능합니다.',
  })
  @Transform(({ value }) => value === '' ? undefined : value)
  password?: string;
}