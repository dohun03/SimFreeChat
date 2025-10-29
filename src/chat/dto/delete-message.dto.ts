import { IsNumber } from 'class-validator';

export class DeleteMessageDto {
  @IsNumber()
  roomId: number;

  @IsNumber()
  messageId: number;
}
