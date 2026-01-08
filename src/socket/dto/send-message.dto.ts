import { IsNotEmpty, IsNumber, IsString, IsEnum } from "class-validator";

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
}

export class SendMessageDto {
  @IsNumber()
  roomId: number;

  @IsNotEmpty({ message: '메시지를 입력해주세요.' })
  @IsString()
  content: string;

  @IsNotEmpty({ message: '타입을 입력해주세요.' })
  @IsEnum(MessageType, { message: '타입은 text 또는 image만 가능합니다.' })
  type: MessageType;
}
