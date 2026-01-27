# ✅ SimFreeChat by 이도훈

> NestJS와 Socket.io 기반의 실시간 텍스트, 이미지 공유 채팅 서비스입니다.  
> 웹소켓 기반의 저지연 텍스트 및 이미지(원본/썸네일) 송수신을 지원합니다.  
> Gemini AI를 연동하여 누적된 대화의 핵심 내용을 요약해 주는 기능을 제공합니다.  
> Redis 캐싱을 통해 세션과 유저 상태를 실시간 동기화하고 DB 부하를 최적화했습니다.  
>
> **진행 기간: 25.09.02 ~ 현재**

---

## 목차

1. [데모 사이트](#데모-사이트)
2. [프로그램 주요 기능](#프로그램-주요-기능)
3. [서비스 아키텍처](#서비스-아키텍처)
4. [사용한 기술 스택](#사용한-기술-스택)
5. [ERD 데이터 모델링](#erd-데이터-모델링)
6. [API 명세서](#api-명세서)
7. [성능 개선 및 문제 해결](#성능-개선-및-문제-해결)
8. [실행 방법](#실행-방법)
9. [추가 구현하고 싶은 기능들](#추가-구현하고-싶은-기능들)

---

## 데모 사이트

- **URL:** [http://13.209.105.94](http://13.209.105.94)
- **테스트 계정:** ID: `test` / PW: `1234`

---

## 프로그램 주요 기능

### 1. 사용자
* **인증 및 세션 관리:** **Redis** 기반 세션 시스템으로 로그인/로그아웃 상태 실시간 관리
* **계정 제어:** 회원가입, 로그인, 로그아웃 및 회원 정보 수정 기능
* **보안 및 동기화:** 동일 계정 중복 접속 차단 및 로그아웃 시 참여 중인 모든 방 자동 퇴장

### 2. 관리자 권한
* **사용자 관리:** 전체 사용자 목록 조회 및 일반 사용자 정보 수정/삭제
* **이용 제한:** 위반 사용자 대상 기간별/영구 접속 차단(Ban) 기능
* **로그 모니터링:** 모든 메시지 생성 및 삭제 로그 조회 및 추적

### 3. 채팅방
* **리소스 관리:** 채팅방 CRUD 및 방별 속성(제목, 비밀번호, 인원 제한) 설정
* **성능 최적화:** **Redis** 기반 실시간 인원수 캐싱을 통한 DB 부하 분산
* **AI 대화 요약:** **Gemini API** 연동을 통한 채팅방 내 누적 메시지 핵심 내용 요약 기능

### 4. 채팅방 권한
* **방장(Owner):** 게스트 강제 퇴장 및 해당 방 진입 차단(Ban) 관리
* **게스트(Guest):** 실시간 메시지 송수신 및 본인 작성 메시지 삭제 권한
* **진입 제어:** 차단 리스트 확인 및 최대 인원수 초과 시 입장 제한 유효성 검사

### 5. 메시지
* **실시간 통신:** **Socket.io** 기반 양방향 실시간 메시지 처리
* **멀티미디어 지원:** 이미지 파일 업로드(원본/썸네일 분리 저장) 및 전송 기능
* **로그 관리:** 메시지 생성/삭제 시 DB 기록 및 삭제 로그 자동 생성

---

## 서비스 아키텍처

<img width="100%" alt="Service Architecture" src="https://github.com/user-attachments/assets/0585df05-5f96-43eb-afde-389a25e9f78e" />

---

## 사용한 기술 스택

| 분류 | 기술 및 용도 |
| :--- | :--- |
| **Backend** | **NestJS**: 모듈화된 아키텍처 기반 서버 로직 구현<br>**Socket.io**: 웹소켓 기반 실시간 양방향 메시지 통신<br>**Gemini API**: AI를 활용한 채팅 내용 요약 기능 구현 |
| **Database** | **MySQL**: 사용자 정보 및 채팅 로그 등 영구 데이터 저장<br>**Redis**: 세션 관리, 데이터 캐싱 및 Write-Back 버퍼링 |
| **DevOps** | **Git**: 소스코드 버전 관리 및 협업<br>**GitHub Actions**: CI/CD 파이프라인을 통한 자동 배포 구축<br>**Docker**: 애플리케이션 컨테이너화 및 환경 독립성 확보 |
| **Infra** | **AWS EC2**: 클라우드 가상 서버 호스팅<br>**Nginx**: 리버스 프록시 설정 및 정적 파일 서버 운영 |
| **Frontend** | **JavaScript**: 클라이언트 사이드 동적 로직 처리<br>**Bootstrap**: 반응형 UI 레이아웃 및 컴포넌트 구현 |

<div align="center"> 
  <img height="30" src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
  <img height="30" src="https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white" />
  <img height="30" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img height="30" src="https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socketdotio&logoColor=white" />
  <img height="30" src="https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white"/>
  <img height="30" src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" />
  <br/>
  <img height="30" src="https://img.shields.io/badge/Git-F05032?style=flat-square&logo=git&logoColor=white"/>
  <img height="30" src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=github-actions&logoColor=white"/>
  <img height="30" src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img height="30" src="https://img.shields.io/badge/Nginx-009639?style=flat-square&logo=nginx&logoColor=white" />
  <img height="30" src="https://img.shields.io/badge/AWS_EC2-FF9900?style=flat-square&logo=amazon-aws&logoColor=white" />
</div>

---

## ERD 데이터 모델링

<img width="100%" alt="ERD" src="https://github.com/user-attachments/assets/1570a903-0a64-413e-8af3-5e9516a60433" />

---

## API 명세서

### 1. 인증 및 사용자 (Auth & Users)
| 메서드 | URL | 설명 |
|--------|------|------|
| POST | `/auth/login` | 로그인 (세션 발급) |
| POST | `/auth/logout` | 로그아웃 (세션 파기 및 전체 퇴장) |
| POST | `/users/register` | 회원가입 |
| GET | `/users/me` | 내 프로필 조회 |
| PATCH | `/users/me` | 내 정보 수정 |
| GET | `/users` | 전체 사용자 조회 (관리자) |
| PATCH | `/users/:userId` | 특정 사용자 수정 (관리자) |
| DELETE | `/users/:userId` | 사용자 삭제 (관리자) |

### 2. 채팅방 및 관리 (Rooms & RoomUsers)
| 메서드 | URL | 설명 |
|--------|------|------|
| POST | `/rooms` | 채팅방 생성 |
| GET | `/rooms` | 전체 채팅방 목록 조회 |
| GET | `/rooms/:roomId` | 채팅방 상세 조회 |
| PATCH | `/rooms/:roomId` | 채팅방 정보 수정 (방장) |
| DELETE | `/rooms/:roomId` | 채팅방 삭제 (방장) |
| GET | `/room-users/:roomId` | 특정 방의 밴 목록 조회 |
| DELETE | `/room-users/:roomId/:userId` | 사용자 밴 해제 (방장) |

### 3. 메시지 및 이미지 업로드 (Messages & Uploads)
| 메서드 | URL | 설명 |
|--------|------|------|
| POST | `/uploads/:roomId` | 이미지 업로드 |
| GET | `/messages/:roomId` | 채팅 내역 조회 (Cursor 기반) |
| GET | `/messages/:roomId/summary` | AI 대화 내용 요약 |
| GET | `/messages/logs` | 전체 메시지 로그 조회 (관리자) |
| GET | `/messages/log/metadata` | 로그 메타데이터 조회 |

---

## 성능 개선 및 문제 해결

- [**이슈 #1: 대용량 메시지 로그 조회 성능 최적화**](https://github.com/dohun03/SimFreeChat/issues/1)
- [**이슈 #2: 대규모 트래픽 대응을 위한 메시지 조회 및 전송 아키텍처 성능 최적화**](https://github.com/dohun03/SimFreeChat/issues/2)
- [**이슈 #3: 이미지 이중 저장 구조(Thumbnail/Origin) 도입을 통한 네트워크 트래픽 최적화**](https://github.com/dohun03/SimFreeChat/issues/3)

---

## 실행 방법

### 1. 저장소 클론
git clone https://github.com/dohun03/SimFreeChat.git

### 2. 의존성 설치
npm install

### 3. 환경 변수 설정 (.env 파일 생성)

```bash
# 서버 포트
PORT=

# TypeORM / MySQL
DB_HOST=
DB_PORT=
DB_USER=
DB_PASS=
DB_NAME=

# Redis
REDIS_HOST=
REDIS_PORT=

# 서버 IP (예: http://localhost:3000 또는 실제 도메인)
SOCKET_ORIGIN=

# 구글 AI 스튜디오에서 발급받은 키
GEMINI_API_KEY=
```

### 4. 서버 실행
npm run start:dev

---

## 추가 구현하고 싶은 기능들
- [ ] 음성 채팅 기능 (WebRTC)
- [x] 이미지 파일 전송 및 썸네일 생성 기능
- [x] AI를 이용한 대화 요약 기능
- [ ] 이메일 인증 기반 비밀번호 찾기