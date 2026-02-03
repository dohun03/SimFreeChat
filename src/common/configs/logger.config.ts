import { utilities } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile = require('winston-daily-rotate-file');

const logDir = 'logs'; // docker-compose에서 연결한 폴더명

export const dailyOptions = (level: string) => {
  return {
    level,
    datePattern: 'YYYY-MM-DD',
    dirname: `${logDir}/${level}`,
    filename: `%DATE%.${level}.log`,
    maxFiles: 30,
    zippedArchive: true,
  };
};

export const winstonConfig = {
  transports: [
    // 콘솔 출력
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'silly',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.colorize({ all: true }),
        winston.format.printf(({ timestamp, level, context, message }) => {
          return `[${timestamp}] [${level}] [${context || 'System'}] - ${message}`;
        }),
      ),
    }),

    // JSON 형식의 파일 저장
    new DailyRotateFile({
      ...dailyOptions('info'),
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json(),
      ),
    }),

    new DailyRotateFile({
      ...dailyOptions('error'),
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json(),
      ),
    }),
  ],
};