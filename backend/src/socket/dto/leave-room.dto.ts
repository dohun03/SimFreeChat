import { IsNumber } from 'class-validator';

export class LeaveRoomDto {
  @IsNumber()
  roomId: number;
}
