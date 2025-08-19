# LABSEMBLE - 혁신적인 제조 솔루션

JLCPCB와 같은 제조/부품구매 전문 웹사이트를 React와 Node.js로 구현한 풀스택 애플리케이션입니다.

## 🚀 주요 기능

### 제조 서비스
- **SMT**: SMT & THT 조립, 재고 부품 관리, 무료 DFM 체크, 24시간 제작
- **회로도 & 아트웍**: 회로도 설계, PCB 레이아웃, DFM 최적화, 전문 엔지니어 지원
- **3D 목업 제작**: 3D 모델링, 프로토타입 제작, 다양한 소재, 빠른 제작
- **부품 구매**: 글로벌 부품 소싱, 품질 보증, 배송 관리, 재고 확인
- **MJ 유통 파트너스 업무**: 전략적 파트너십, 사업 확장 지원, 유통망 활용, 맞춤형 솔루션

### 사용자 기능
- 회원가입/로그인 시스템
- 견적 요청 및 관리
- 주문 추적 및 상태 확인
- 사용자 대시보드
- 파일 업로드 및 관리

## 🛠️ 기술 스택

### Frontend
- **React 18** - 사용자 인터페이스
- **React Router** - 라우팅
- **Tailwind CSS** - 스타일링
- **Lucide React** - 아이콘

### Backend
- **Node.js** - 서버 런타임
- **Express.js** - 웹 프레임워크
- **JWT** - 인증
- **bcryptjs** - 비밀번호 해싱

## 🎨 브랜드 아이덴티티

**LABSEMBLE**은 혁신적인 제조 솔루션을 제공하는 글로벌 제조업체입니다.

### 로고 디자인
- **심볼**: 파란색에서 보라색으로 그라데이션된 정사각형
- **타이포그래피**: 모던하고 깔끔한 "L" 문자
- **컬러**: 블루-퍼플 그라데이션 (#3B82F6 → #8B5CF6)
- **의미**: 혁신, 기술, 신뢰성을 상징

## 🚀 시작하기

### 1. 의존성 설치
```bash
npm run install:all
```

### 2. 개발 서버 실행
```bash
npm run dev
```

### 3. 브라우저에서 확인
- **클라이언트**: http://localhost:3000
- **서버 API**: http://localhost:5000/api/health

## 📱 주요 페이지

### 홈페이지 (`/`)
- 서비스 소개 및 통계
- 주요 제조 서비스 카드
- CTA 섹션

## 🔐 API 엔드포인트

- `GET /api/health` - 서버 상태 확인
- `GET /api/test` - 테스트 엔드포인트

## 📦 배포

### 프로덕션 빌드
```bash
npm run build
```

### 서버 시작
```bash
npm start
```

## 🚀 Ubuntu 24.04 + Nginx 상용서버 배포 가이드

### 📋 사전 준비사항

#### 1. 서버 정보
- **OS**: Ubuntu 24.04 LTS
- **웹서버**: Nginx
- **Node.js**: 18.x LTS
- **데이터베이스**: MongoDB (선택사항)
- **도메인**: your-domain.com (예시)

#### 2. 서버 접속
```bash
ssh root@your-server-ip
```

### 🔧 1단계: 서버 기본 설정

#### 1.1 시스템 업데이트
```bash
# 시스템 패키지 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
```

#### 1.2 방화벽 설정
```bash
# UFW 방화벽 활성화
sudo ufw enable

# 기본 포트 허용
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw allow 5000

# 방화벽 상태 확인
sudo ufw status
```

#### 1.3 사용자 생성 (보안)
```bash
# 새 사용자 생성
sudo adduser labsemble
sudo usermod -aG sudo labsemble

# SSH 키 설정
sudo mkdir -p /home/labsemble/.ssh
sudo cp ~/.ssh/authorized_keys /home/labsemble/.ssh/
sudo chown -R labsemble:labsemble /home/labsemble/.ssh
sudo chmod 700 /home/labsemble/.ssh
sudo chmod 600 /home/labsemble/.ssh/authorized_keys

# root SSH 비활성화 (선택사항)
sudo nano /etc/ssh/sshd_config
# PermitRootLogin no
sudo systemctl restart sshd
```

### 🐍 2단계: Node.js 설치

#### 2.1 Node.js 18.x LTS 설치
```bash
# NodeSource 저장소 추가
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Node.js 설치
sudo apt-get install -y nodejs

# 버전 확인
node --version
npm --version

# PM2 설치 (프로세스 관리)
sudo npm install -g pm2
```

#### 2.2 MongoDB 설치 (선택사항)
```bash
# MongoDB 공개 키 가져오기
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# MongoDB 저장소 추가
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# MongoDB 설치
sudo apt update
sudo apt install -y mongodb-org

# MongoDB 서비스 시작
sudo systemctl start mongod
sudo systemctl enable mongod

# 상태 확인
sudo systemctl status mongod
```

### 🌐 3단계: Nginx 설치 및 설정

#### 3.1 Nginx 설치
```bash
sudo apt install -y nginx

# Nginx 서비스 시작
sudo systemctl start nginx
sudo systemctl enable nginx

# 상태 확인
sudo systemctl status nginx
```

#### 3.2 Nginx 기본 설정
```bash
# 기본 사이트 비활성화
sudo rm /etc/nginx/sites-enabled/default

# Nginx 설정 파일 생성
sudo nano /etc/nginx/sites-available/labsemble
```

#### 3.3 Nginx 설정 파일 내용
```nginx
# /etc/nginx/sites-available/labsemble

# HTTP 서버 (포트 80)
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # HTTP를 HTTPS로 리다이렉트
    return 301 https://$server_name$request_uri;
}

# HTTPS 서버 (포트 443)
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL 인증서 설정
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL 보안 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 보안 헤더
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # 클라이언트 최대 업로드 크기
    client_max_body_size 100M;
    
    # React 앱 (정적 파일)
    location / {
        root /var/www/labsemble/client/build;
        try_files $uri $uri/ /index.html;
        
        # 캐싱 설정
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API 프록시 (Node.js 서버)
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # 파일 업로드 프록시
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 에러 페이지
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
}
```

#### 3.4 Nginx 설정 활성화
```bash
# 사이트 활성화
sudo ln -s /etc/nginx/sites-available/labsemble /etc/nginx/sites-enabled/

# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

### 🔐 4단계: SSL 인증서 설정 (Let's Encrypt)

#### 4.1 Certbot 설치
```bash
# Snap 설치 (Ubuntu 24.04 기본)
sudo snap install core
sudo snap refresh core

# Certbot 설치
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

#### 4.2 SSL 인증서 발급
```bash
# 도메인 확인 후 인증서 발급
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

### 📁 5단계: 애플리케이션 배포

#### 5.1 프로젝트 디렉토리 생성
```bash
# 웹 디렉토리 생성
sudo mkdir -p /var/www/labsemble
sudo chown -R labsemble:labsemble /var/www/labsemble

# 사용자 전환
su - labsemble
cd /var/www/labsemble
```

#### 5.2 코드 배포
```bash
# Git 저장소 클론
git clone https://github.com/your-username/labsemble.git .

# 의존성 설치
npm run install:all

# 환경 변수 설정
cp server/env.example server/.env
nano server/.env
```

#### 5.3 환경 변수 설정
```bash
# server/.env 파일 내용
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-here
MONGODB_URI=mongodb://localhost:27017/labsemble
CORS_ORIGIN=https://your-domain.com
```

#### 5.4 프로덕션 빌드
```bash
# 클라이언트 빌드
cd client
npm run build
cd ..

# 서버 시작
cd server
npm start
```

### ⚙️ 6단계: PM2로 프로세스 관리

#### 6.1 PM2 설정 파일 생성
```bash
# ecosystem.config.js 생성
nano ecosystem.config.js
```

#### 6.2 PM2 설정 파일 내용
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'labsemble-server',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10
  }]
};
```

#### 6.3 PM2로 서버 실행
```bash
# 로그 디렉토리 생성
mkdir -p logs

# PM2로 서버 시작
pm2 start ecosystem.config.js

# PM2 상태 확인
pm2 status

# PM2 로그 확인
pm2 logs

# PM2 자동 시작 설정
pm2 startup
pm2 save
```

### 🔍 7단계: 모니터링 및 로그

#### 7.1 로그 설정
```bash
# Nginx 로그 확인
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PM2 로그 확인
pm2 logs labsemble-server

# 시스템 로그 확인
sudo journalctl -u nginx -f
sudo journalctl -u mongod -f
```

#### 7.2 성능 모니터링
```bash
# 시스템 리소스 모니터링
htop
iotop
nethogs

# Nginx 상태 확인
sudo nginx -t
sudo systemctl status nginx
```

### 🚀 8단계: 배포 자동화 (선택사항)

#### 8.1 배포 스크립트 생성
```bash
# deploy.sh 생성
nano deploy.sh
```

#### 8.2 배포 스크립트 내용
```bash
#!/bin/bash
# deploy.sh

echo "🚀 LABSEMBLE 배포 시작..."

# 코드 업데이트
git pull origin main

# 의존성 설치
npm run install:all

# 클라이언트 빌드
cd client
npm run build
cd ..

# 서버 재시작
pm2 restart labsemble-server

echo "✅ 배포 완료!"
```

#### 8.3 스크립트 실행 권한 설정
```bash
chmod +x deploy.sh
```

### 🔧 9단계: 문제 해결

#### 9.1 일반적인 문제들
```bash
# 포트 확인
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :5000

# 서비스 상태 확인
sudo systemctl status nginx
sudo systemctl status mongod
pm2 status

# 권한 문제 해결
sudo chown -R labsemble:labsemble /var/www/labsemble
sudo chmod -R 755 /var/www/labsemble
```

#### 9.2 로그 분석
```bash
# Nginx 에러 로그
sudo tail -f /var/log/nginx/error.log

# PM2 로그
pm2 logs labsemble-server --lines 100

# 시스템 로그
sudo journalctl -u nginx -f
```

### 📊 10단계: 성능 최적화

#### 10.1 Nginx 최적화
```bash
# Nginx 메인 설정 최적화
sudo nano /etc/nginx/nginx.conf

# worker_processes auto;
# worker_connections 1024;
# keepalive_timeout 65;
# gzip on;
# gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

#### 10.2 Node.js 최적화
```bash
# PM2 클러스터 모드
pm2 start ecosystem.config.js --name labsemble-server -i max

# 메모리 제한 설정
pm2 start ecosystem.config.js --max-memory-restart 1G
```

### 🎯 배포 완료 체크리스트

- [ ] Ubuntu 24.04 서버 설정 완료
- [ ] Node.js 18.x LTS 설치 완료
- [ ] Nginx 설치 및 설정 완료
- [ ] SSL 인증서 발급 완료
- [ ] 애플리케이션 코드 배포 완료
- [ ] PM2로 프로세스 관리 설정 완료
- [ ] 도메인 접속 테스트 완료
- [ ] API 엔드포인트 테스트 완료
- [ ] 로그 모니터링 설정 완료
- [ ] 백업 및 복구 계획 수립 완료

### 🌐 최종 접속 테스트

```bash
# 도메인 접속 테스트
curl -I https://your-domain.com

# API 엔드포인트 테스트
curl https://your-domain.com/api/health

# SSL 인증서 확인
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

---

**🚀 LABSEMBLE 상용서버 배포 완료!** 🎉 