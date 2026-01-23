# 1. 의존성 단계
FROM node:20-alpine AS base
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

# 2. 개발용 (target: development)
FROM base AS development
COPY . .
# 개발 모드 실행
CMD ["npm", "run", "start:dev"]

# 3. 빌드용 (실서비스용 준비)
FROM base AS builder
COPY . .
RUN npm run build

# 4. 실서비스용 (target: production)
FROM node:20-alpine AS production
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/package*.json ./
RUN npm install --omit=dev
COPY --from=builder /usr/src/app/dist ./dist
# 실서비스는 컴파일된 파일로 실행
CMD ["node", "dist/main"]