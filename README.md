<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).


# ✅ Realtime Chat Community by 이도훈

> NestJS + Socket.io 기반의 실시간 채팅방 프로젝트입니다.  
> Redis를 활용한 세션/유저 관리와 MySQL 기반의 채팅 로그 저장을 통해 **확장 가능한 실시간 커뮤니케이션 서비스**를 구현했습니다.  
> 회원/비회원 모두 참여 가능하며, 방장은 밴, 강퇴, 음소거 권한을 가집니다.  
>
> **진행 기간: 25.05.01 ~ 25.07.31 (약 3개월)**

---

## 목차

1. [프로그램 주요 기능](#프로그램-주요-기능)  
   - [1. 사용자 관리 (회원 접속)](#1-사용자-관리-회원비회원-접속)  
   - [2. 채팅방 관리 (생성/입장/퇴장/삭제)](#2-채팅방-관리-생성입장퇴장삭제)  
   - [3. 메시지 관리 (송수신/저장/조회)](#3-메시지-관리-송수신저장조회)  
   - [4. 권한 관리 (방장/관리자/회원/게스트)](#4-권한-관리-방장관리자회원게스트)  
2. [사용한 기술 스택](#사용한-기술-스택)  
3. [ERD 데이터 모델링](#erd-데이터-모델링)  
4. [API 명세서](#api-명세서)  
5. [Socket.io 이벤트 명세](#socketio-이벤트-명세)  
6. [구현 화면](#구현-화면)  
7. [설치 및 실행 방법](#설치-및-실행-방법)  
8. [문제 해결](#문제-해결)  
9. [추가 구현하고 싶은 기능들](#추가-구현하고-싶은-기능들)  

---

## 프로그램 주요 기능

### 1. 사용자 관리 (회원 접속)
- 회원: 이메일/비밀번호 로그인 (JWT 인증)
- 로그아웃 기능 제공

### 2. 채팅방 관리 (생성/입장/퇴장/삭제)
- 누구나 방 생성 가능
- 비밀번호 없는 공개방
- 방장 권한: 삭제, 밴, 킥, 음소거
- 입장/퇴장 시 시스템 메시지 출력

### 3. 메시지 관리 (송수신/저장/조회)
- 실시간 메시지 송수신 (Socket.io)
- MySQL DB에 채팅 로그 저장
- 특정 방의 전체 메시지 조회 가능
- 메시지 삭제는 작성자만 가능

### 4. 권한 관리 (방장/관리자/회원/게스트)
- **OWNER(방장):** 방 삭제, 밴/강퇴/음소거  
- **ADMIN:** 밴/강퇴/음소거  
- **MEMBER:** 일반 메시지 전송 가능  
- **GUEST:** 메시지 전송 가능 (IP 표시)  

---

## 사용한 기술 스택

- **NestJS**: 서버 사이드 프레임워크
- **Socket.io**: 실시간 양방향 통신
- **MySQL**: 채팅 로그 및 방/유저 관리
- **Redis**: 밴 목록, 세션, 온라인 유저 관리
- **React.js** (프론트엔드): 채팅 UI

<div align="center"> 
<img height="30" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
<img height="30" src="https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white" />
<img height="30" src="https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socketdotio&logoColor=white" />
<img height="30" src="https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white" />
<img height="30" src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" />
<img height="30" src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" />
</div>

---

## ERD 데이터 모델링

(이미지 자리 - ERD.png)

---

## 폴더 구조

```
chat-app/
├─ src/
│  ├─ app.module.ts
│  ├─ main.ts
│  ├─ users/
│  │  ├─ users.module.ts
│  │  ├─ users.controller.ts
│  │  ├─ users.service.ts
│  │  └─ dto/
│  │      ├─ create-user.dto.ts
│  │      ├─ update-user.dto.ts
│  │      └─ login.dto.ts
│  ├─ rooms/
│  │  ├─ rooms.module.ts
│  │  ├─ rooms.controller.ts
│  │  ├─ rooms.service.ts
│  │  └─ dto/
│  ├─ room-users/
│  │  ├─ room-users.module.ts
│  │  ├─ room-users.controller.ts
│  │  ├─ room-users.service.ts
│  │  └─ dto/
│  ├─ messages/
│  │  ├─ messages.module.ts
│  │  ├─ messages.controller.ts
│  │  ├─ messages.service.ts
│  │  └─ dto/
│  ├─ auth/
│  │  ├─ auth.module.ts
│  │  ├─ auth.service.ts
│  │  └─ jwt.strategy.ts
│  └─ common/
│      ├─ guards/
│      ├─ interceptors/
│      └─ filters/
├─ package.json
├─ tsconfig.json
└─ .env
```

## API 명세서

# 1. 인증 API (`/auth`)

- `POST /auth/login` — 로그인 (세션 생성: Redis)  
- `POST /auth/logout` — 로그아웃 (세션 삭제)  
- `GET /auth/me` — 현재 로그인한 사용자 정보 (세션 기준)  

※ JWT를 사용하지 않으므로 “JWT 발급” 표기는 제거

# 2. 사용자 API (`/users`)

- `POST /users/register` — 회원가입  
- `GET /users/:id` — 유저 정보 조회 (본인 또는 관리자)  
- `GET /users` — (관리자) 전체 유저 조회  
- `PATCH /users/:id` — 유저 정보 수정 (본인 또는 관리자)  
- `PATCH /users/:id/ban` — (관리자) 유저 차단/해제 + `ban_reason` 설정 (차단 시 기존 세션 무효화 권장)

## 3. 채팅방 관련 API (`/rooms`)
- `POST /rooms` — 채팅방 생성 (owner_id 필요)
- `GET /rooms` — 전체 채팅방 조회
- `GET /rooms/:id` — 채팅방 정보 조회
- `PATCH /rooms/:id` — 채팅방 이름 수정 (owner만 가능)
- `DELETE /rooms/:id` — 채팅방 삭제 (owner만 가능)

## 4. 방-유저 매핑 관련 API (`/room-users`)
- `POST /room-users/join` — 유저 방 참여
- `DELETE /room-users/leave` — 유저 방 나가기
- `PATCH /room-users/:id/ban` — 방 관리자: 유저 차단/해제
- `PATCH /room-users/:id/mute` — 방 관리자: 유저 음소거/해제
- `GET /room-users/:roomId` — 방에 참여 중인 유저 목록 조회

## 5. 메시지 관련 API (`/messages`)
- `POST /messages` — 메시지 전송 (room_id, user_id 필요)
- `GET /messages/:roomId` — 방별 메시지 조회 (페이징 가능)
- `DELETE /messages/:id` — 관리자/본인 메시지 삭제

---

## 🔌 Socket.io 이벤트 명세

| 이벤트명       | 설명                |
|----------------|---------------------|
| `joinRoom`     | 방 입장              |
| `leaveRoom`    | 방 퇴장              |
| `sendMessage`  | 메시지 송수신        |
| `banUser`      | 특정 유저 밴         |
| `kickUser`     | 특정 유저 강퇴       |
| `muteUser`     | 특정 유저 음소거     |
| `deleteRoom`   | 방 삭제              |

---

## 🖼 구현 화면

- 로그인 화면 (예시 이미지 자리)  
- 방 목록 화면 (예시 이미지 자리)  
- 채팅방 화면 (예시 이미지 자리)  

---

## ⚙️ 설치 및 실행 방법

### 실행 환경
- Node.js 20.x
- MySQL 8.0.x
- Redis 7.x

### 프로젝트 설치 및 실행
```
git clone https://github.com/dohun03/realtime-chat.git
cd realtime-chat
npm install
npm run start:dev
```
MySQL 테이블 생성 쿼리
```
-- 유저 테이블
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  password VARCHAR(255),
  is_admin BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  ban_reason VARCHAR(50),
  ip_address VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 채팅방 테이블
CREATE TABLE rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  owner_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 방-유저 매핑 테이블
CREATE TABLE room_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('OWNER','MEMBER') DEFAULT 'MEMBER',
  is_banned BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 메시지 테이블
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_room_id (room_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```
1️⃣ 기획 & 요구사항 정의
목적: 포트폴리오용 실시간 채팅 서비스

-핵심 기능-

방장 권한: 밴, 킥, 음소거, 방 삭제
참여자 권한: 본인 음소거

텍스트 메시지 송수신
채팅 기록 MySQL에 저장

-추후 확장 기능-
음성 채팅(WebRTC)
파일 공유