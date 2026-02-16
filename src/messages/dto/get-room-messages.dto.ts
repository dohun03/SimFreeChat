import { IsOptional, IsString, IsEnum, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetRoomMessagesDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({
    description: '커서가 있을 경우에만 동작합니다. (before: 과거, recent: 미래)',
    enum: ['before', 'recent'],
    required: false,
  })
  @IsOptional()
  @ValidateIf((o) => o.direction !== '')
  @IsEnum(['before', 'recent'])
  direction?: 'before' | 'recent'; 
}