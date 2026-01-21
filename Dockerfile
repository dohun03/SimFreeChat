# 빌드 스테이지
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 실행 스테이지
FROM node:20-alpine
WORKDIR /usr/src/app

# 의존성 설치
COPY --from=builder /usr/src/app/package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# 빌드 파일 가져오기
COPY --from=builder /usr/src/app/dist ./dist

# 서버 실행
CMD ["node", "dist/main"]