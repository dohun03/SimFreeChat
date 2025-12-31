# ✅ SimFreeChat by 이도훈

> NestJS와 Socket.io 기반으로 개발한 실시간 채팅 서비스입니다.  
> Redis를 활용한 세션/유저 관리와 MySQL 기반의 데이터 저장을 통해 **실시간 커뮤니케이션 서비스**를 구현했습니다.  
> 회원가입/로그인 후 참여할 수 있으며, 방장은 밴 및 강퇴 권한을 가집니다.
>
> **진행 기간: 25.09.02 ~ 25.10.29 (약 2개월)**

---

## 목차

1. [시연 영상](#시연-영상)
2. [프로그램 주요 기능](#프로그램-주요-기능)
   - [1. 사용자](#1-사용자)
   - [2. 관리자 권한](#2-관리자-권한)
   - [3. 채팅방](#3-채팅방)
   - [4. 채팅방 권한](#4-채팅방-권한)
   - [5. 메시지](#5-메시지)
3. [사용한 기술 스택](#사용한-기술-스택)
4. [아키텍처](#아키텍처)
5. [ERD 데이터 모델링](#erd-데이터-모델링)
6. [API 명세서](#api-명세서)
7. [폴더 구조](#폴더-구조)
8. [설치 및 실행 방법](#설치-및-실행-방법)
9. [문제 해결](#문제-해결)
10. [추가 구현하고 싶은 기능들](#추가-구현하고-싶은-기능들)

---

## 시연 영상

음성이 없는 짧은 데모입니다

[데모 영상 (GitHub Pages)](https://dohun03.github.io/SimFreeChat/assets/demo.mp4)

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

- **Nginx**: Reverse Proxy 및 정적 파일 서버 (API/WebSocket 프록시, gzip, 요청 제한 적용)
- **Node.js / NestJS / TypeScript**: REST API 및 WebSocket 서버 구축  
- **Socket.io**: 실시간 양방향 통신  
- **MySQL**: 관계형 데이터 모델링 및 영구 데이터 저장  
- **Redis**: 세션 캐싱 및 실시간 방 인원 저장  
- **JavaScript / Bootstrap**: 프론트 UI 구성 및 이벤트 처리

<div align="center"> 
  <img height="30" src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
  <img height="30" src="https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white" />
  <img height="30" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img height="30" src="https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socketdotio&logoColor=white" />
  <img height="30" src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" />
  <img height="30" src="https://img.shields.io/badge/Bootstrap-7952B3?style=flat-square&logo=bootstrap&logoColor=white" />
  <br/>
  <img height="30" src="https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white"/>
  <img height="30" src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" />
  <img height="30" src="https://img.shields.io/badge/Nginx-009639?style=flat-square&logo=nginx&logoColor=white" />
  <img height="30" src="https://img.shields.io/badge/Ubuntu-E95420?style=flat-square&logo=ubuntu&logoColor=white" />
  <img height="30" src="https://img.shields.io/badge/Git-F05032?style=flat-square&logo=git&logoColor=white"/>
  <img height="30" src="https://img.shields.io/badge/GitHub-black?style=flat-square&logo=GitHub&logoColor=white"/>
</div>

---

## 아키텍처

<img width="100%" alt="Image" src="https://github.com/user-attachments/assets/d6e7075a-03c2-46fb-aad7-85f6a63cc88d" />

> App Server는 현재 단일 프로세스로 운영되며, 추후 PM2 Cluster를 이용한 병렬화와 Redis Pub/Sub 기반 확장을 통해 실시간 채팅 처리량 증가 및 안정성 강화를 계획하고 있습니다.

---

## ERD 데이터 모델링

- **user**: 사용자 정보  
- **room**: 채팅방 정보  
- **room_users**: 채팅방 참여자 및 밴 정보 관리  
- **message**: 실시간 메시지 저장  
- **message_log**: 메시지 생성 및 삭제 이력 저장

<img width="100%" alt="Image" src="https://github.com/user-attachments/assets/1570a903-0a64-413e-8af3-5e9516a60433" />

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
| PATCH | `/users/:userId` | 특정 사용자 정보 수정 (관리자) |
| DELETE | `/users/:userId` | 사용자 삭제 (관리자) |

---

### 채팅방 관련 (RoomsController)

| 메서드 | URL | 설명 |
|--------|------|------|
| POST | `/rooms` | 채팅방 생성 |
| PATCH | `/rooms/:roomId` | 채팅방 수정 (방장) |
| DELETE | `/rooms/:roomId` | 채팅방 삭제 (방장) |
| GET | `/rooms` | 전체 채팅방 조회 (검색 지원) |
| GET | `/rooms/:roomId` | 특정 채팅방 상세 조회 |

---

### 채팅방 밴 관리 (RoomUsersController)

| 메서드 | URL | 설명 |
|--------|------|------|
| GET | `/room-users/:roomId` | 특정 방의 밴된 사용자 목록 조회 |
| DELETE | `/room-users/:roomId/:userId` | 밴 해제 (방장) |

---

### 메시지 관련 (MessagesController)

| 메서드 | URL | 설명 |
|--------|------|------|
| GET | `/messages/logs` | 전체 메시지 로그 조회 (관리자) |
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

### 실행 환경
- Node.js 20.18.3
- MySQL 8.0.36
- Redis 5.0.7

### 프로젝트 설치 및 실행
``` bash
git clone https://github.com/dohun03/SimFreeChat.git

cd your-project # 프로그램이 실행될 디렉토리로 이동

npm install
npm run start # 실행용
npm run start:dev # 개발용
```

### .env 파일 작성 예시
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

### 🔸 1. 채팅방 메시지 조회 성능 개선

#### 문제
채팅방별 메시지가 수천~수만 건 이상 누적되는 구조에서 채팅방 입장 시 
메시지를 전체 로드하는 방식으로 인해 초기 로딩 지연 및 클라이언트 렌더링 성능 저하 문제가 발생함.

#### 해결
- 채팅방 입장 시 최신 메시지 100개만 조회하도록 제한  
- 마지막 메시지 ID를 기준으로 이전 데이터를 조회하는 Cursor 기반 조회 방식 도입  
- 사용자가 스크롤 할 경우에만 추가 메시지 로드

#### 결과
- 메시지 누적 개수와 무관한 안정적인 초기 로딩 성능 확보  
- 불필요한 데이터 조회 및 DOM 렌더링 제거  
- 서버, 네트워크, 클라이언트 전반의 부하 감소  

🔗 관련 이슈: #2

---

### 🔸 2. 대용량 메시지 로그 조회 성능 최적화

#### 문제
메시지 로그 테이블이 100만 건 이상으로 증가하면서 날짜, 방, 유저, 타입, 검색어 등 복합 조건 조회 시 SELECT / COUNT 쿼리 성능 저하 및 페이지 초기 로딩 지연이 발생함.

#### 해결
- 실제 조회 패턴을 기준으로 `room_id`, `user_id` 중심의 복합 인덱스 재설계  
- SELECT와 COUNT의 목적 차이를 고려하여 인덱스를 분리 구성  
- Cursor 기반 페이지네이션 도입으로 OFFSET 스캔 제거  
- 동일 조건 COUNT 쿼리 반복 실행을 방지하기 위해 애플리케이션 레벨 캐싱 적용

#### 결과
- 대량 로그 환경에서도 안정적인 조회 성능 확보  
- COUNT 쿼리 중복 실행 제거로 초기 로딩 지연 감소  
- 복합 조건 증가 시에도 일관된 응답 속도 유지  

🔗 관련 이슈: #1

---

### 🔸 3. 채팅방 소켓 구조 설계

#### 문제
채팅방과 사용자 간의 연결 구조를 다중 탭 접속, 세션 충돌, 비정상 종료 상황에서도 안정적이고 일관되게 관리할 필요가 있었음.

#### 해결
- 각 사용자의 소켓 연결 정보를 중앙에서 통합 관리하도록 구조화  
- 동일 유저가 다른 탭에서 접속할 경우 기존 연결 자동 종료 처리  
- 로그아웃 시 모든 방에서 사용자의 소켓을 일괄 제거하고 퇴장 브로드캐스트 수행  
- 전체 흐름:  
  `LogoutController → ChatService → ChatEvents → ChatGateway`

---

### 🔸 4. 채팅방 강제 연결 끊기 시 소켓 관리

#### 문제
채팅방 내 특정 사용자를 강제로 퇴장시키거나 연결을 끊어야 하는 상황에서 소켓을 관리할 방법이 필요했음.

#### 해결
- `Map` 구조(`socketId ↔ userId ↔ roomId`)로 소켓 정보를 매핑하여 관리  
- 특정 유저의 소켓을 즉시 조회하여  
  연결 해제, 메시지 전달 차단, 방 퇴장 처리 등을 효율적으로 수행 가능

![socket map 구조 예시](https://github.com/user-attachments/assets/8cb042bb-74c9-4d8a-b0c1-4d6edaaae126)
> socket map 구조 예시

---

## 추가 구현하고 싶은 기능들

> 추후 여유가 된다면 구현해보고 싶은 기능입니다.

- [ ] 음성 채팅 기능  
- [x] 파일 전송 기능  
- [ ] 메시지 답장 기능  
- [ ] 이메일 인증 기반 비밀번호 찾기  
