import { IsNumber, IsString, IsNotEmpty } from 'class-validator';

export class BanUserDto {
  @IsNumber()
  roomId: number;

  @IsNumber()
  userId: number;

  @IsNotEmpty({ message: '밴 사유를 입력해주세요.' })
  @IsString()
  banReason: string;
}
