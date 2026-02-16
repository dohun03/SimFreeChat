# ✅ [SimFreeChat] 실시간 채팅 서비스 프로젝트

## 📋 프로젝트 개요

**SimFreeChat**은 **NestJS와 Socket.io** 기반의 실시간 멀티미디어 채팅 서비스입니다.  
웹소켓 기반의 저지연 **텍스트 및 이미지(원본/썸네일)** 송수신을 지원합니다.  
**Gemini AI**를 연동하여 누적된 대화의 **핵심 내용을 요약**해 주는 기능을 제공합니다.  
**Redis**을 통해 세션과 유저 상태, 메시지 등을 캐싱하여 DB 부하를 최소화했습니다.  

* **진행 기간**: 2025.09.02 ~ 현재 (지속 업데이트 중)
* **참여 인원**: 1명 (개인 프로젝트)
* **배포 환경**: AWS EC2, AWS RDS, Docker, Nginx, GitHub Actions
* **데모 사이트**: [https://simfreechat.com](https://simfreechat.com)

---

## 🏗️ 서비스 아키텍처

<img width="100%" alt="Service Architecture" src="https://github.com/user-attachments/assets/24ee7e65-fcca-464b-8d7b-e4d16a3a0059" />

---

## 🛠️ 기술 스택

### 백엔드 및 실시간 통신
<div align="left">
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socketdotio&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini_AI-8E75E9?style=flat-square&logo=googlegemini&logoColor=white" />
</div>

### 데이터베이스 및 캐싱
<div align="left">
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white"/>
  <img src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" />
</div>

### 인프라 및 배포
<div align="left">
  <img src="https://img.shields.io/badge/AWS_EC2-FF9900?style=flat-square&logo=amazon-aws&logoColor=white" />
  <img src="https://img.shields.io/badge/AWS_RDS-527FFF?style=flat-square&logo=amazon-rds&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Nginx-009639?style=flat-square&logo=nginx&logoColor=white" />
  <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=github-actions&logoColor=white"/>
  <img src="https://img.shields.io/badge/Cloudflare-F38020?style=flat-square&logo=cloudflare&logoColor=white"/>
</div>

### 세부 기술 스택 상세 (Tech Stack Details)

| 기술 | 용도 및 역할 |
| :--- | :--- |
| **NestJS** | 모듈화된 아키텍처 기반의 확장성 있는 서버 로직 구현 |
| **Socket.io** | 실시간 양방향 메시지 통신 처리 |
| **Gemini API** | 대화 맥락 파악 및 실시간 요약 기능 |
| **Redis** | 빠른 속도를 위한 데이터 캐싱, 세션 상태 관리 및 DB Write-Back 버퍼링 |
| **MySQL(AWS RDS)** | 영구적 데이터 저장 용도 |
| **AWS EC2** | 클라우드 가상 서버 호스팅을 통한 서비스 인프라 운영 |
| **Cloudflare** | DNS 관리 및 TLS/SSL 인증서를 통한 보안 통신(HTTPS) 적용 |
| **Nginx** | 리버스 프록시 설정, 로드밸런싱, 정적 리소스 서빙 |
| **Docker** | 애플리케이션의 컨테이너화로 환경 독립성 및 배포 편의성 확보 |
| **GitHub Actions** | 코드 푸시부터 배포까지의 CI/CD 파이프라인 자동화 구축 |
| **JavaScript** | 클라이언트 사이드 동적 UI 조작 및 소켓 이벤트 핸들링 |
| **Bootstrap** | 반응형 웹 디자인 적용으로 다양한 디바이스 환경 대응 |

---

## 🎬 영상

### **메시지 전송 & 삭제**
![Image](https://github.com/user-attachments/assets/1362f5cb-a4e8-446c-874a-34317995f21a)

### **메시지 AI 요약**
![Image](https://github.com/user-attachments/assets/239551ac-a421-41ed-8eb0-151e4b2bcc52)

### **AWS EC2 모니터링 (트래픽 테스트)**
![Image](https://github.com/user-attachments/assets/d63dfeec-e941-4a86-819b-0c689cf08f1a)

### **AWS RDS 모니터링 (트래픽 테스트)**
![Image](https://github.com/user-attachments/assets/f512a8fb-e870-43bb-a79f-e6f06ab8afb1)

---

## 📖 API 명세서 (Swagger)

본 프로젝트는 **Swagger**를 통해 모든 엔드포인트를 문서화했습니다.

* **Swagger UI:** [https://simfreechat.com/api/docs](https://simfreechat.com/api/docs)

| 엔드포인트 (Endpoint) | 핵심 기능 (Core Logic) |
| :--- | :--- |
| **🔐 /auth** | 세션 기반 로그인/로그아웃 관리 |
| **👤 /users** | 사용자 정보 및 상태 관리 |
| **💬 /rooms** | 채팅방 관리 |
| **🛡️ /room-users** | 방장 권한 기반의 게스트 밴 상태 관리 |
| **📝 /messages** | 채팅 메시지 내역 및 메시지 로그 관리 |
| **📁 /uploads** | 이미지 업로드 기능 |

---

## 📊 ERD 데이터 모델링

<img width="100%" alt="ERD" src="https://github.com/user-attachments/assets/1570a903-0a64-413e-8af3-5e9516a60433" />

---

## ⚡ 성능 개선 및 문제 해결

- [**이슈 #1: 대용량 메시지 로그 DB 조회 성능 최적화**](https://github.com/dohun03/SimFreeChat/issues/1)
- [**이슈 #2: 트래픽 부하 테스트를 통해 쓰기 성능 200배 개선, 조회 부하 90% 절감**](https://github.com/dohun03/SimFreeChat/issues/2)
- [**이슈 #3: 이미지 이중 저장 구조(Thumbnail/Origin) 도입을 통한 네트워크 트래픽 최적화**](https://github.com/dohun03/SimFreeChat/issues/3)
- [**이슈 #4: AWS 인프라 환경에서 트래픽 부하 테스트를 통해 단계별 성능 최적화**](https://github.com/dohun03/SimFreeChat/issues/4)

---

## 🚀 실행 방법

본 프로젝트는 Docker 환경에서 가장 쉽고 빠르게 실행할 수 있습니다.

### 1. 저장소 클론
git clone https://github.com/dohun03/SimFreeChat.git  
cd [프로젝트명]

### 2. 환경 변수 설정 (.env 파일 생성)

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
SERVER_URL=

# 구글 AI 스튜디오에서 발급받은 키
GEMINI_API_KEY=

# Bcrypt 단계
BCRYPT_SALT_ROUNDS=

MY_UID=1000
MY_GID=1000
```

### 3. 컨테이너 실행
docker-compose up -d --build

---

## 📝 추가 구현하고 싶은 기능들
- [ ] 음성 채팅 기능 (WebRTC)
- [x] 이미지 파일 전송 및 썸네일 생성 기능
- [x] AI를 이용한 대화 요약 기능
- [ ] 이메일 인증 기반 비밀번호 찾기