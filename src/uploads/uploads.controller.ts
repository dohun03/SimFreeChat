import { Controller, Post, UploadedFiles, UseInterceptors, BadRequestException, Param, ParseIntPipe, UseGuards, Logger } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { writeFile, unlink } from 'fs/promises';
import sanitize from 'sanitize-filename';
import { v4 as uuid } from 'uuid';
import { SessionGuard } from 'src/auth/guards/session.guard';

@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads/rooms');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  @UseGuards(SessionGuard)
  @Post('/:roomId')
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
    // 방별 전용 디렉토리 경로 설정
    const roomDir = path.join(this.uploadDir, roomId.toString());

    // 폴더가 없으면 생성
    if (!fs.existsSync(roomDir)) {
      fs.mkdirSync(roomDir, { recursive: true });
    }

    if (!files?.file?.[0] || !files?.thumbnail?.[0]) {
      throw new BadRequestException('파일이 존재하지 않습니다.');
    }

    const originFile = files.file[0];
    const thumbFile = files.thumbnail[0];

    // 확장자 & MIME 검증
    const allowedExt = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.tif', '.tiff', '.jfif'];
    const allowedMime = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/x-icon', 'image/tiff'];
    const ext = path.extname(originFile.originalname).toLowerCase();
    const isInvalidExt = originFile.originalname !== 'blob' && !allowedExt.includes(ext);
    const isInvalidMime = !allowedMime.includes(originFile.mimetype);

    if (isInvalidExt || isInvalidMime) {
      const reason = isInvalidExt ? `허용되지 않은 확장자(${ext})` : `허용되지 않은 MIME(${originFile.mimetype})`;
      
      this.logger.warn(`[ROOM_FILE_UPLOAD_DENIED] 방ID:${roomId} | 파일명:${originFile.originalname} | 사유:${reason}`);
      throw new BadRequestException(reason);
    }

    // 폴더 용량 체크
    try {
      const getDirSize = (dir: string): number => {
        const files = fs.readdirSync(dir);
        return files.reduce((acc, file) => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) return acc + getDirSize(filePath);
          return acc + stat.size;
        }, 0);
      };

      const totalSize = getDirSize(this.uploadDir);
      
      if (totalSize > 2 * 1024 * 1024 * 1024) { // 2GB
        throw new BadRequestException('서버 저장 용량이 초과되었습니다 (최대 2GB).');
      }
    } catch (e) {
      if (e instanceof BadRequestException) {
        this.logger.warn(`[ROOM_FILE_UPLOAD_DENIED] 방ID:${roomId} | 사유:${e.message}`);
        throw e;
      }
      this.logger.error(`[ROOM_FILE_UPLOAD_ERROR] 방ID:${roomId} | 사유:${e.message}`);
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

      return { filename: originFileName };

    } catch (err) {
      this.logger.error(`[ROOM_FILE_SAVE_ERROR] 방ID:${roomId} | 파일명:${originFileName} | 사유:${err.message}`, err.stack);
      
      // 롤백 로직
      try {
        if (fs.existsSync(originPath)) {
          await unlink(originPath);
          this.logger.warn(`[ROOM_FILE_ROLLBACK_SUCCESS] 방ID:${roomId} | 파일:원본 | 사유:저장 오류로 인한 롤백`);
        }
        if (fs.existsSync(thumbPath)) {
          await unlink(thumbPath);
          this.logger.warn(`[ROOM_FILE_ROLLBACK_SUCCESS] 방ID:${roomId} | 파일:썸네일 | 사유:저장 오류로 인한 롤백`);
        }
      } catch (rollbackErr) {
        this.logger.error(`[ROOM_FILE_ROLLBACK_ERROR] 방ID:${roomId} | 파일명:${originFileName} | 사유:${rollbackErr.message}`);
      }

      throw new BadRequestException('이미지 저장 중 오류가 발생했습니다.');
    }
  }
}