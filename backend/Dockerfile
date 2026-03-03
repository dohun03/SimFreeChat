# 1. 의존성 단계
FROM node:20-alpine AS base
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

# 2. 개발용
FROM base AS development
COPY . .
RUN mkdir -p logs/info logs/error uploads && chown -R node:node logs uploads
USER node
CMD ["npm", "run", "start:dev"]

# 3. 빌드용
FROM base AS builder
COPY . .
RUN npm run build

# 4. 실서비스용
FROM node:20-alpine AS production
WORKDIR /usr/src/app
RUN apk add --no-cache curl
COPY --from=builder /usr/src/app/package*.json ./
RUN npm install --omit=dev
COPY --from=builder /usr/src/app/dist ./dist
RUN mkdir -p logs/info logs/error uploads && chown -R node:node logs uploads
USER node
EXPOSE 4000
CMD ["node", "dist/main"]