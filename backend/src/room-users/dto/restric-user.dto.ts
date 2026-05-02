import { IsNumber, IsEnum, IsString, IsPositive, MaxLength } from 'class-validator';
import { RoomUserStatus } from '../entities/room-users.entity';
import { ApiProperty } from '@nestjs/swagger';

export class RestrictUserDto {
  @ApiProperty({ description: '제재 상태', enum: RoomUserStatus, example: RoomUserStatus.BANNED })
  @IsEnum([RoomUserStatus.MUTED, RoomUserStatus.BANNED])
  status: RoomUserStatus.MUTED | RoomUserStatus.BANNED;

  @ApiProperty({ description: '제재 기간 (일 단위, 9999는 영구)', example: 7 })
  @IsNumber()
  @IsPositive()
  days: number;

  @ApiProperty({ description: '제재 사유', example: '욕설 및 비방' })
  @IsString()
  @MaxLength(255)
  reason: string; // Optional 제거, 필수값
}