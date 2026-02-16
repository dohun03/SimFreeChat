import { Controller, Post, UploadedFiles, UseInterceptors, BadRequestException, Param, ParseIntPipe, UseGuards, Logger, NotFoundException } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { writeFile, unlink } from 'fs/promises';
import sanitize from 'sanitize-filename';
import { v4 as uuid } from 'uuid';
import { SessionGuard } from 'src/auth/guards/session.guard';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RoomsService } from 'src/rooms/rooms.service';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads/rooms');

  constructor(
    private readonly roomsService: RoomsService
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  @UseGuards(SessionGuard)
  @Post('/:roomId')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '채팅방 내 이미지 및 썸네일 업로드' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        thumbnail: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ 
    status: 201, 
    description: '업로드 성공', 
    schema: {
      example: { filename: 'uuid-name.jpg', thumbnail: 'thumb-uuid-name.webp' }
    } 
  })
  @ApiResponse({ 
    status: 400, 
    description: '잘못된 요청 (파일 누락, 허용되지 않은 확장자, 용량 초과 등)',
    schema: {
      example: { statusCode: 400, message: '원본 파일: 허용되지 않은 확장자(.exe)', error: 'Bad Request' }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: '인증 실패 (세션 만료 등)',
    schema: {
      example: { statusCode: 401, message: 'Unauthorized' }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: '방을 찾을 수 없음',
    schema: {
      example: { statusCode: 404, message: '존재하지 않는 방(ID: 999)입니다.', error: 'Not Found' }
    }
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
      },
    ),
  )
  async uploadFile(
    @Param('roomId', ParseIntPipe) roomId: number,
    @UploadedFiles() files: { file?: Express.Multer.File[]; thumbnail?: Express.Multer.File[] }
  ) {
    const room = await this.roomsService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundException(`존재하지 않는 방(ID: ${roomId})입니다.`);
    }

    if (!files?.file?.[0] || !files?.thumbnail?.[0]) {
      throw new BadRequestException('파일이 존재하지 않습니다.');
    }

    const originFile = files.file[0];
    const thumbFile = files.thumbnail[0];

    const allowedOriginExt = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.tif', '.tiff', '.jfif'];
    const allowedOriginMime = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/x-icon', 'image/tiff'];

    // 원본 검증
    const originExt = path.extname(originFile.originalname).toLowerCase();
    const isInvalidOriginExt = originFile.originalname !== 'blob' && !allowedOriginExt.includes(originExt);
    const isInvalidOriginMime = !allowedOriginMime.includes(originFile.mimetype);

    if (isInvalidOriginExt || isInvalidOriginMime) {
      const reason = isInvalidOriginExt ? `허용되지 않은 확장자(${originExt})` : `허용되지 않은 MIME(${originFile.mimetype})`;
      this.logger.warn(`[UPLOAD_DENIED_ORIGIN] 방ID:${roomId} | 사유:${reason}`);
      throw new BadRequestException(`원본 파일: ${reason}`);
    }

    // 썸네일 검증 (WebP 전용)
    const thumbExt = path.extname(thumbFile.originalname).toLowerCase();
    const isInvalidThumbExt = thumbExt !== '.webp';
    const isInvalidThumbMime = thumbFile.mimetype !== 'image/webp';

    if (isInvalidThumbExt || isInvalidThumbMime) {
      const reason = isInvalidThumbExt ? `썸네일은 webp 확장자만 허용됩니다(${thumbExt})` : `썸네일은 image/webp 타입만 허용됩니다`;
      this.logger.warn(`[UPLOAD_DENIED_THUMB] 방ID:${roomId} | 사유:${reason}`);
      throw new BadRequestException(reason);
    }

    // 방별 전용 디렉토리 경로 설정
    const roomDir = path.join(this.uploadDir, roomId.toString());
    if (!fs.existsSync(roomDir)) {
      fs.mkdirSync(roomDir, { recursive: true });
    }

    // 파일명 생성 및 저장 준비
    const sharedUuid = uuid();
    const originalName = Buffer.from(originFile.originalname, 'latin1').toString('utf8');
    const safeName = sanitize(originalName);
    const originFileName = `${sharedUuid}-${safeName}`;
    const thumbFileName = `thumb-${sharedUuid}-${safeName.replace(path.extname(safeName), '.webp')}`;

    const originPath = path.join(roomDir, originFileName);
    const thumbPath = path.join(roomDir, thumbFileName);

    // 물리적 파일 저장
    try {
      await Promise.all([
        writeFile(originPath, originFile.buffer),
        writeFile(thumbPath, thumbFile.buffer),
      ]);

      this.logger.log(`[UPLOAD_SUCCESS] 방ID:${roomId} | 파일:${originFileName}`);
      return { filename: originFileName, thumbnail: thumbFileName };

    } catch (err) {
      this.logger.error(`[UPLOAD_ERROR] 방ID:${roomId} | 사유:${err.message}`);

      Promise.all([
        unlink(originPath).catch(() => {}),
        unlink(thumbPath).catch(() => {}),
      ]);

      throw new BadRequestException('이미지 저장 중 오류가 발생했습니다.');
    }
  }
}