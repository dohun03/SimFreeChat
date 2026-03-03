import { IsNumber } from 'class-validator';

export class KickUserDto {
  @IsNumber()
  roomId: number;

  @IsNumber()
  userId: number;
}
