import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class SendMessageDto {
  @IsNumber()
  roomId: number;

  @IsNotEmpty({ message: '메시지를 입력해주세요.' })
  @IsString()
  content: string;
}