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

    // 파일 존재 여부 체크
    if (!files?.file?.[0] || !files?.thumbnail?.[0]) {
      throw new BadRequestException('파일이 존재하지 않습니다.');
    }

    const originFile = files.file[0];
    const thumbFile = files.thumbnail[0];

    // 확장자 & MIME 검증
    const allowedExt = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.tif', '.tiff', '.jfif'];
    const allowedMime = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/x-icon', 'image/tiff'];

    const ext = path.extname(originFile.originalname).toLowerCase();

    // 원본 파일 검증
    if (originFile.originalname !== 'blob' && !allowedExt.includes(ext)) {
      throw new BadRequestException(`허용되지 않은 확장자입니다: ${ext}`);
    }
    if (!allowedMime.includes(originFile.mimetype)) {
      throw new BadRequestException(`허용되지 않은 파일 형식(MIME)입니다: ${originFile.mimetype}`);
    }

    // 폴더 용량 체크
    try {
      const dirFiles = fs.readdirSync(this.uploadDir);
      let folderSize = 0;
      for (const f of dirFiles) {
        const stat = fs.statSync(path.join(this.uploadDir, f));
        if (stat.isFile()) folderSize += stat.size;
      }
      
      if (folderSize > 2 * 1024 * 1024 * 1024) { // 2GB 제한
        throw new BadRequestException('서버 저장 용량이 초과되었습니다 (최대 2GB).');
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      this.logger.error('용량 체크 중 오류:', e);
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

      this.logger.log(`파일 업로드 성공: Room(${roomId}): File(${originFileName}), Size(${originFile.size} bytes)`);
      return { filename: originFileName };

    } catch (err) {
      this.logger.error(`파일 저장 중 에러: Room(${roomId}) 저장 중 에러: ${err.message}`, err.stack);
      
      // 롤백 로직: 하나라도 저장되었다면 삭제
      try {
        if (fs.existsSync(originPath)) {
          await unlink(originPath);
          this.logger.warn(`파일 롤백: 실패한 원본 파일 삭제됨: ${originPath}`);
        }
        if (fs.existsSync(thumbPath)) {
          await unlink(thumbPath);
          this.logger.warn(`파일 롤백: 실패한 썸네일 파일 삭제됨: ${thumbPath}`);
        }
      } catch (rollbackErr) {
        this.logger.error(`파일 롤백 중 추가 에러: ${rollbackErr}`);
      }

      throw new BadRequestException('이미지 저장 중 오류가 발생했습니다.');
    }
  }
}