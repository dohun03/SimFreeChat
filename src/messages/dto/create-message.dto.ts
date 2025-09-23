import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateMeSsageDto {
  @IsNumber()
  roomId: number;

  @IsNumber()
  userId: number;

  @IsString()
  @IsNotEmpty()
  content: string;
}