# 1. 공통 베이스
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# 2. 개발용
FROM base AS development
EXPOSE 80 
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "80"]

# 3. 빌드용
FROM base AS builder
RUN npm run build

# 4. 실서비스용
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]