import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class JoinRoomDto {
  @IsNumber()
  roomId: number;

  @IsOptional()
  @IsString()
  password?: string;
}
