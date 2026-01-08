import { IsNumber, IsString, IsNotEmpty } from 'class-validator';

export class DeleteMessageDto {
  @IsNumber()
  roomId: number;

  @IsString()
  @IsNotEmpty()
  messageId: string;
}
