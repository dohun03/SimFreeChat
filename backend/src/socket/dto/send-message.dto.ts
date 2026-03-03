import { IsNotEmpty, IsNumber, IsString, IsEnum, MaxLength, MinLength } from "class-validator";

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
}

export class SendMessageDto {
  @IsNumber()
  roomId: number;

  @IsString()
  @MinLength(1, { message: '메시지를 입력해주세요.' })
  @MaxLength(500, { message: '메시지는 최대 500자까지만 가능합니다.' })
  content: string;

  @IsNotEmpty({ message: '타입을 입력해주세요.' })
  @IsEnum(MessageType, { message: '타입은 text 또는 image만 가능합니다.' })
  type: MessageType;
}
