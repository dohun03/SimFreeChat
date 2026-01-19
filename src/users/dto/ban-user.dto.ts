import { IsString, Matches, IsEmail, IsOptional, isNumber, IsNotEmpty, IsInt, Min, Length } from 'class-validator';

export class BanUserDto {
  @IsNotEmpty({ message: '밴 사유를 입력해주세요.' })
  @IsString()
  @Length(2, 30, { message: '밴 사유는 2자 이상 30자 이내로 입력해주세요.' })
  reason: string;

  @IsInt({ message: '밴 기간을 숫자로 입력해주세요.' })
  @Min(1, { message: '최소 1일 이상을 입력해주세요.' })
  banDays: number;
}