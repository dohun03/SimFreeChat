import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, ValidateIf } from 'class-validator';

export class GetAllUsersQueryDto {
  @ApiPropertyOptional({ 
    description: '검색어 (이름 또는 이메일 포함 여부)', 
    example: 'gildong' 
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ 
    description: '관리자 여부 필터', 
    enum: ['true', 'false'],
  })
  @IsOptional()
  @ValidateIf((o) => o.isAdmin !== '')
  @IsEnum(['true', 'false'])
  isAdmin?: string;

  @ApiPropertyOptional({ 
    description: '차단 여부 필터', 
    enum: ['true', 'false'],
  })
  @IsOptional()
  @ValidateIf((o) => o.isBanned !== '')
  @IsEnum(['true', 'false'])
  isBanned?: string;

  @ApiPropertyOptional({ 
    description: '한 페이지에 불러올 개수 (기본값: 50)', 
    example: '50' 
  })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ 
    description: '건너뛸 개수 (오프셋)', 
    example: '0' 
  })
  @IsOptional()
  @IsString()
  offset?: string;
}