import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import sanitize from 'sanitize-filename';
import { v4 as uuid } from 'uuid';

@Controller('uploads')
export class UploadsController {
  private readonly uploadDir = path.join(process.cwd(), 'uploads/images');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'uploads/images')),
      // 파일명 인코딩
      filename: (req, file, cb) => {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const safeName = sanitize(originalName);
        const filename = `${uuid()}-${safeName}`;
        cb(null, filename);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      // 1. 확장자/MIME 체크
      const allowedExt = [
        '.png', '.jpg', '.jpeg', '.gif', '.webp',
        '.bmp', '.ico', '.tif', '.tiff', '.jfif'
      ];
      const allowedMime = [
        'image/png', 'image/jpeg', 'image/gif',
        'image/webp', 'image/bmp', 'image/x-icon', 'image/tiff'
      ]
      const ext = path.extname(file.originalname).toLowerCase();
      
      if (!allowedExt.includes(ext)) return cb(new BadRequestException('허용되지 않은 확장자입니다.'), false);
      if (!allowedMime.includes(file.mimetype)) return cb(new BadRequestException('허용되지 않은 MIME 타입입니다.'), false);

      // 2. 폴더 용량 체크 (업로드 전)
      const files = fs.readdirSync(path.join(process.cwd(), 'uploads/images'));
      let folderSize = 0;

      for (const f of files) {
        const stat = fs.statSync(path.join(process.cwd(), 'uploads/images', f));
        if (stat.isFile()) folderSize += stat.size;
      }

      const MAX_FOLDER_SIZE = 2 * 1024 * 1024 * 1024;
      if (folderSize > MAX_FOLDER_SIZE)
        return cb(new BadRequestException('업로드 폴더 용량이 최대치(2GB)를 초과합니다.'), false);

      cb(null, true);
    },
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return {
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
    };
  }
}
