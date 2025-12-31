module.exports = {
  apps: [{
    name: 'chatserver',        // 앱 이름
    script: 'dist/main.js',    // NestJS 빌드 후 실행 파일 경로
    instances: 'max',          // CPU 코어 수만큼 프로세스 생성 ('max' 또는 숫자)
    exec_mode: 'cluster',      // 클러스터 모드 설정
    watch: false,              // 파일 변경 감지 여부
    env: {
      NODE_ENV: 'production',
    },
  }],
};