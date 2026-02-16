import { IsOptional, IsString, IsEnum, IsInt, IsDateString, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetAllMessageLogsQueryDto {
  @IsOptional() @IsString()
  search?: string;

  @ApiProperty({ 
    description: '검색 타입', 
    enum: ['message', 'user', 'room'], 
    required: false 
  })
  @IsOptional() 
  @ValidateIf((o) => o.searchType !== '')
  @IsEnum(['message', 'user', 'room'])
  searchType?: 'message' | 'user' | 'room';

  @IsOptional() @IsDateString()
  startDate?: string;

  @IsOptional() @IsDateString()
  endDate?: string;

  @IsOptional() @IsString()
  messageType?: string;

  @IsOptional() @IsString()
  actionType?: string;

  @IsOptional() @Type(() => Number) @IsInt()
  roomIdType?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  roomOwnerIdType?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  userIdType?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  line?: number = 100;

  @IsOptional() @IsString()
  cursor?: string;

  @ApiProperty({ 
    description: '페이징 방향', 
    enum: ['prev', 'next'], 
    required: false 
  })
  @IsOptional()
  @ValidateIf((o) => o.direction !== '')
  @IsEnum(['prev', 'next'])
  direction?: 'prev' | 'next';
}