import { IsNumber, IsString, IsNotEmpty, IsEnum, Max, Min } from 'class-validator';
import { RoomUserStatus } from 'src/room-users/entities/room-users.entity'; 

export class BanUserDto {
  @IsNumber()
  roomId: number;

  @IsNumber()
  userId: number;

  @IsEnum(RoomUserStatus, { message: '제재 상태(banned/muted)가 올바르지 않습니다.' })
  status: RoomUserStatus;

  @IsNumber()
  @Min(1)
  @Max(9999)
  @IsNotEmpty({ message: '제재 기간을 선택해주세요.' })
  days: number;

  @IsString()
  @IsNotEmpty({ message: '사유를 입력해주세요.' })
  reason: string;
}
