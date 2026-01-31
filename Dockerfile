# 1. 의존성 단계
FROM node:20-alpine AS base
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

# 2. 개발용
FROM base AS development
COPY . .
CMD ["npm", "run", "start:dev"]

# 3. 빌드용
FROM base AS builder
COPY . .
RUN npm run build

# 4. 실서비스용
FROM node:20-alpine AS production
WORKDIR /usr/src/app

# 필수 도구 설치 (상태 확인용 curl 및 이미지 처리 라이브러리 등 대비)
RUN apk add --no-cache curl

COPY --from=builder /usr/src/app/package*.json ./
RUN npm install --omit=dev

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/public ./public

# ⭐ 운영 환경에서 업로드 폴더 미리 생성 및 권한 설정
RUN mkdir -p uploads && chown node:node uploads

# 보안을 위해 node 사용자 계정으로 실행 (권장)
USER node

EXPOSE 4000

CMD ["node", "dist/main"]