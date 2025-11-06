# ✅ SimFreeChat by 이도훈

> NestJS와 Socket.io 기반으로 개발한 실시간 채팅 서비스입니다.  
> Redis를 활용한 세션/유저 관리와 MySQL 기반의 데이터 저장을 통해 **실시간 커뮤니케이션 서비스**를 구현했습니다.  
> 회원가입/로그인 후 참여할 수 있으며, 방장은 밴 및 강퇴 권한을 가집니다.
>
> **진행 기간: 25.09.02 ~ 25.10.29 (약 2개월)**

---

## 목차

1. [프로그램 주요 기능](#프로그램-주요-기능)
   - [1. 사용자](#1-사용자)
   - [2. 관리자 권한](#2-관리자-권한)
   - [3. 채팅방](#3-채팅방)
   - [4. 채팅방 권한](#4-채팅방-권한)
   - [5. 메시지](#5-메시지)
2. [사용한 기술 스택](#사용한-기술-스택)
3. [아키텍처](#아키텍처)
4. [ERD 데이터 모델링](#erd-데이터-모델링)
5. [API 명세서](#api-명세서)
6. [폴더 구조](#폴더-구조)
7. [설치 및 실행 방법](#설치-및-실행-방법)
8. [문제 해결](#문제-해결)
9. [추가 구현하고 싶은 기능들](#추가-구현하고-싶은-기능들)

---

## 프로그램 주요 기능

### 1. 사용자

- 회원가입 / 로그인 / 로그아웃 / 프로필 변경 가능  
- 로그인 시 Redis 세션에 사용자 ID 저장  
- 로그아웃 시 Redis 세션 삭제 후 모든 채팅방에서 자동 퇴장  
- 프로필 변경 시 닉네임, 이메일, 비밀번호 수정 가능

---

### 2. 관리자 권한

- 모든 사용자 목록 조회  
- 일반 사용자 정보 수정 및 삭제 가능 (단, 관리자 계정은 제외)  
- 메시지 작성 및 삭제 로그 조회

---

### 3. 채팅방

- 채팅방 **생성 / 조회 / 수정 / 삭제 기능** 제공  
- **방 제목, 인원수, 비밀번호, 밴 목록** 등 주요 속성 관리  
- **Redis**를 활용해 실시간 인원수 캐싱 처리  
- **방 삭제 시**, 관련 메시지 및 참여자 연결이 자동 종료됨  
- **비공개 방**은 비밀번호 검증 후 입장 가능  
- **최대 인원 수 초과 시** 접속 제한  
- 동일 사용자가 **같은 방에 여러 탭으로 접속 시**, 기존 연결 자동 종료

---

### 4. 채팅방 권한

- **방장:** 게스트 강퇴 및 밴(접속 제한) 가능  
- **게스트:** 메시지 송수신 및 일반 참여 가능, **본인 메시지 삭제 가능**  
- 밴된 사용자는 해당 방에 재입장할 수 없음

---

### 5. 메시지

- 실시간 메시지 생성 / 조회 / 삭제 기능  
- 메시지 생성 및 삭제 시, 해당 로그를 자동 기록

---

## 사용한 기술 스택

- **Node.js / NestJS**: REST API 및 WebSocket 서버 구축  
- **Socket.io**: 실시간 양방향 통신  
- **MySQL**: 관계형 데이터 모델링 및 영구 데이터 저장  
- **Redis**: 세션 캐싱 및 실시간 방 인원 저장  
- **JavaScript / Bootstrap**: 프론트 UI 구성 및 이벤트 처리

<div align="center"> 
<img height="30" src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
<img height="30" src="https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white" />
<img height="30" src="https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socketdotio&logoColor=white" />
<img height="30" src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" />
<img height="30" src="https://img.shields.io/badge/Bootstrap-7952B3?style=flat-square&logo=bootstrap&logoColor=white" />
<br/>
<img height="30" src="https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white"/>
<img height="30" src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" />
<img height="30" src="https://img.shields.io/badge/Git-F05032?style=flat-square&logo=git&logoColor=white"/>
<img height="30" src="https://img.shields.io/badge/GitHub-black?style=flat-square&logo=GitHub&logoColor=white"/>
</div>

---

## 아키텍처

<img width="960" height="942" alt="Image" src="https://github.com/user-attachments/assets/b4d4118c-809d-452b-906e-bb8f65f1f91f" />

---

## ERD 데이터 모델링

- **user**: 사용자 정보  
- **room**: 채팅방 정보  
- **room_users**: 채팅방 참여자 및 밴 정보 관리  
- **message**: 실시간 메시지 저장  
- **message_log**: 메시지 전송 및 삭제 기록 저장

<img width="1381" height="1052" alt="Image" src="https://github.com/user-attachments/assets/1570a903-0a64-413e-8af3-5e9516a60433" />

---

## API 명세서

> 모든 API는 NestJS 컨트롤러 구조로 관리됩니다.  
> 회원가입, 로그인, 채팅방 목록 조회를 제외한 모든 API는 세션 인증 후 접근 가능합니다.

---

### 인증 관련 (AuthController)

| 메서드 | URL | 설명 |
|--------|------|------|
| POST | `/auth/login` | 사용자 로그인 (세션 쿠키 발급) |
| POST | `/auth/logout` | 로그아웃 (세션 쿠키 삭제 및 채팅방 전체 퇴장) |

---

### 사용자 관련 (UsersController)

| 메서드 | URL | 설명 |
|--------|------|------|
| POST | `/users/register` | 회원가입 |
| GET | `/users/me` | 내 프로필 조회 |
| GET | `/users/:userId` | 특정 사용자 조회 |
| GET | `/users` | 전체 사용자 조회 (검색 지원) |
| PATCH | `/users/me` | 내 프로필 수정 |
| PATCH | `/users/:userId` | 특정 사용자 정보 수정 (관리자 또는 본인) |
| DELETE | `/users/:userId` | 사용자 삭제 (관리자 또는 본인) |

---

### 채팅방 관련 (RoomsController)

| 메서드 | URL | 설명 |
|--------|------|------|
| POST | `/rooms` | 채팅방 생성 |
| PATCH | `/rooms/:roomId` | 채팅방 수정 (방장만 가능) |
| DELETE | `/rooms/:roomId` | 채팅방 삭제 (방장만 가능) |
| GET | `/rooms` | 전체 채팅방 조회 (검색 지원) |
| GET | `/rooms/:roomId` | 특정 채팅방 상세 조회 |

---

### 채팅방 밴 관리 (RoomUsersController)

| 메서드 | URL | 설명 |
|--------|------|------|
| GET | `/room-users/:roomId` | 특정 방의 밴된 사용자 목록 조회 |
| DELETE | `/room-users/:roomId/:userId` | 밴 해제 (방장만 가능) |

---

### 메시지 관련 (MessagesController)

| 메서드 | URL | 설명 |
|--------|------|------|
| GET | `/messages/logs` | 전체 메시지 로그 조회 (관리자용) |
| GET | `/messages/:roomId` | 특정 채팅방 내 메시지 조회 |

---

### 채팅 게이트웨이 (ChatGateway)

| 이벤트명 | 설명 |
|-----------|------|
| `joinRoom` | 사용자가 채팅방에 입장 |
| `leaveRoom` | 사용자가 채팅방에서 퇴장 |
| `sendMessage` | 채팅 메시지 전송 |
| `deleteMessage` | 특정 메시지 삭제 |
| `kickUser` | 방장이 특정 유저를 강퇴 |
| `banUser` | 방장이 특정 유저를 밴 (재입장 금지) |
| `leaveAllRooms` | 특정 유저가 모든 방에서 퇴장 (EventEmitter) |
| `updateRoom` | 방 정보 변경 시 알림 (EventEmitter) |
| `deleteRoom` | 방 삭제 시 알림 (EventEmitter) |

---

## 폴더 구조

```
CHAT/
├─ public/
│  ├─ css/             # 스타일 시트
│  ├─ img/             # 이미지
│  ├─ js/
│  │  └─ pages/        # 페이지별 JS
│  └─ app.js           # 클라이언트 라우터
├─ src/
│  ├─ auth/            # 인증 관련 로직
│  ├─ chat/            # 웹소켓 및 실시간 채팅 처리
│  ├─ messages/        # 메시지 관련 로직
│  ├─ redis/           # Redis 연동 및 캐싱
│  ├─ room-users/      # 채팅방 밴 관리
│  ├─ rooms/           # 채팅방 관리
│  └─ users/           # 사용자 관리
├─ app.controller.ts
├─ app.module.ts
├─ app.service.ts
├─ main.ts
├─ index.html
└─ package.json
```

---

## 설치 및 실행 방법

실행 환경
- Node.js 20.18.3
- MySQL 8.0.36
- Redis 5.0.7

프로젝트 설치 및 실행
``` bash

git clone https://github.com/dohun03/SimFreeChat.git

cd your-project # 프로그램이 실행될 디렉토리로 이동

npm install
npm run start # 실행용
npm run start:dev # 개발용
```

.env 파일 작성 예시
```
# 서버 포트
PORT=4000

# TypeORM / MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=0000
DB_NAME=chat

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# 웹소켓 (외부 접속용 도메인)
SOCKET_ORIGIN=http://localhost:4000
```

---

## 문제 해결

### 🔸 1. 채팅방 소켓 구조 설계

- **고민:** 채팅방과 사용자의 연결 구조를 **안정적이고 확장성 있게 설계**하는 방법을 고민함.  
  - 다중 탭 접속, 세션 충돌, 퇴장 처리 등 **연결 관리의 일관성 유지**가 핵심 이슈였음.

- **해결 방향:** 각 사용자의 소켓 연결 정보를 중앙에서 통합 관리하도록 구조화함.  
  - 동일 유저가 다른 탭에서 접속할 경우 기존 연결을 **자동 종료**하도록 처리.  
  - 로그아웃 시 모든 방에서 사용자의 소켓을 **일괄 제거 및 퇴장 브로드캐스트** 수행.  
  - 전체 흐름: `LogoutController → ChatService (로직 처리) → ChatEvents (게이트웨이 전달) → ChatGateway (소켓 제거 및 브로드캐스팅)`

---

### 🔸 2. 채팅방 강제 연결 끊기 시 소켓 관리

- **고민:** 채팅방 내 특정 사용자를 강제로 퇴장시키거나 연결을 끊을 때 **소켓을 효율적으로 관리할 방법**을 고민함.

- **해결 방향:** `Map` 형태(`socketId ↔ userId ↔ roomId`)로 매핑하여 관리.
  - 특정 유저의 소켓을 빠르게 찾아 **연결 해제**, **메시지 전달 차단**, **방 퇴장 처리** 등 수행 가능.

![socket map 구조 예시](https://github.com/user-attachments/assets/8cb042bb-74c9-4d8a-b0c1-4d6edaaae126)
> socket map 구조 예시

---

## [추가 구현하고 싶은 기능들]

> 추후 여유가 된다면 구현해보고 싶은 기능입니다.

- [ ] 음성 채팅 기능  
- [ ] 파일 전송 기능  
- [ ] 메시지 답장 기능  
- [ ] 이메일 인증 기반 비밀번호 찾기  
