import { IsString, IsNotEmpty, IsInt, Min, Max, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BanUserDto {
  @ApiProperty({ description: '차단 사유', example: '욕설 및 비방' })
  @IsNotEmpty({ message: '밴 사유를 입력해주세요.' })
  @IsString()
  @Length(2, 30, { message: '밴 사유는 2자 이상 30자 이내로 입력해주세요.' })
  reason: string;

  @ApiProperty({ description: '차단 일수 (9999는 영구차단)', example: 7 })
  @IsInt({ message: '밴 기간을 숫자로 입력해주세요.' })
  @Min(1, { message: '최소 1일 이상을 입력해주세요.' })
  @Max(9999, { message: '최대 9999일 이하를 입력해주세요.' })
  banDays: number;
}