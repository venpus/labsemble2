# 🚀 LABSEMBLE 서버 배포 가이드 (AWS Lightsail 최적화)

## 📋 개요

이 폴더는 LABSEMBLE 프로젝트를 **AWS Lightsail + Ubuntu 24.04 + Nginx** 환경에 배포하기 위한 모든 설정 파일과 스크립트를 포함합니다.

**🚀 AWS Lightsail 특화 기능:**
- ☁️ 클라우드 환경 자동 감지 및 최적화
- 🌐 Lightsail 네트워크 인터페이스 최적화
- 📊 5분마다 자동 모니터링
- 💾 일일 자동 백업 시스템
- 🔒 Lightsail 보안 설정 최적화

## 📁 파일 구조

```
deployment/
├── README.md                    # 이 파일 (배포 가이드)
├── nginx/
│   ├── labsemble.conf          # Nginx 설정 파일
│   └── nginx.conf              # Nginx 메인 설정 최적화
├── scripts/
│   ├── setup-server.sh         # 서버 초기 설정 스크립트
│   ├── setup-lightsail.sh      # 🆕 Lightsail 특화 설정 스크립트
│   ├── install-nodejs.sh       # Node.js 설치 스크립트
│   ├── install-mongodb.sh      # MongoDB 설치 스크립트 (선택사항)
│   ├── setup-nginx.sh          # Nginx 설치 및 설정 스크립트
│   ├── setup-ssl.sh            # SSL 인증서 설정 스크립트
│   ├── deploy-app.sh           # 애플리케이션 배포 스크립트
│   ├── deploy.sh                # 🆕 전체 배포 자동화 스크립트 (Lightsail 최적화)
│   └── mongodb-troubleshoot.sh # MongoDB 문제 해결 스크립트
├── config/
│   ├── ecosystem.config.js      # PM2 설정 파일 (Lightsail 최적화)
│   └── env.production          # 프로덕션 환경 변수 (Lightsail 특화)
├── systemd/
│   ├── labsemble.service       # systemd 서비스 파일
│   └── nginx.service           # Nginx 서비스 파일
└── monitoring/
    ├── logrotate.conf          # 로그 로테이션 설정 (Lightsail 최적화)
    └── monitoring.sh           # 모니터링 스크립트 (Lightsail 특화)
```

## 🚀 빠른 시작 (AWS Lightsail)

### 1. 서버 접속
```bash
ssh root@your-lightsail-ip
```

### 2. 전체 배포 자동화 (권장)
```bash
# 전체 배포 자동화 (Lightsail 최적화 포함)
chmod +x deployment/scripts/deploy.sh
./deployment/scripts/deploy.sh
```

### 3. 단계별 배포
```bash
# 1단계: 서버 기본 설정
chmod +x deployment/scripts/setup-server.sh
./deployment/scripts/setup-server.sh

# 2단계: Lightsail 특화 설정 (권장)
chmod +x deployment/scripts/setup-lightsail.sh
./deployment/scripts/setup-lightsail.sh

# 3단계: Node.js 설치
chmod +x deployment/scripts/install-nodejs.sh
./deployment/scripts/install-nodejs.sh

# 4단계: MongoDB 설치 (선택사항)
chmod +x deployment/scripts/install-mongodb.sh
./deployment/scripts/install-mongodb.sh

# 5단계: Nginx 설정
chmod +x deployment/scripts/setup-nginx.sh
./deployment/scripts/setup-nginx.sh

# 6단계: SSL 인증서 설정
chmod +x deployment/scripts/setup-ssl.sh
./deployment/scripts/setup-ssl.sh

# 7단계: 애플리케이션 배포
chmod +x deployment/scripts/deploy-app.sh
./deployment/scripts/deploy-app.sh
```

## 🔧 사전 요구사항

- **AWS Lightsail** Ubuntu 24.04 LTS 인스턴스
- **도메인 이름** (예: labsemble.com)
- **SSH 접근 권한**
- **최소 2GB RAM, 20GB 디스크 공간**

## ☁️ AWS Lightsail 특화 기능

### **자동 최적화**
- 클라우드 환경 자동 감지
- 네트워크 설정 최적화
- 메모리 및 CPU 사용량 최적화
- 클라우드-초기화 성능 향상

### **모니터링 시스템**
- **5분마다 자동 모니터링**: 시스템 리소스, 서비스 상태, 포트 상태
- **Lightsail 특화 체크**: 클라우드-초기화, AWS CLI, 네트워크 인터페이스
- **자동 로그 관리**: 일일 로그 로테이션 및 압축

### **백업 시스템**
- **일일 자동 백업**: 애플리케이션, 설정, 로그 파일
- **백업 보관**: 최근 7일간 백업 유지
- **압축 백업**: 디스크 공간 효율적 사용

### **보안 최적화**
- UFW 방화벽 설정
- SSH 보안 강화
- 사용자 권한 최적화 (labsemble:www-data)

## 📝 설정 파일 수정

### 도메인 변경
모든 설정 파일에서 `labsemble.com`을 실제 도메인으로 변경하세요:

```bash
# 일괄 변경
find deployment/ -type f -name "*.conf" -o -name "*.sh" -o -name "*.js" | xargs sed -i 's/labsemble\.com/your-domain.com/g'
```

### 환경 변수 설정
```bash
# 프로덕션 환경 변수 설정
cp deployment/config/env.production /var/www/labsemble/server/.env
nano /var/www/labsemble/server/.env
```

## 🎯 배포 완료 체크리스트

- [ ] 서버 기본 설정 완료
- [ ] 🆕 Lightsail 특화 설정 완료
- [ ] Node.js 18.x LTS 설치 완료
- [ ] MongoDB 설치 완료 (선택사항)
- [ ] Nginx 설치 및 설정 완료
- [ ] SSL 인증서 발급 완료
- [ ] 애플리케이션 코드 배포 완료
- [ ] PM2로 프로세스 관리 설정 완료
- [ ] 모니터링 및 백업 시스템 설정 완료
- [ ] 도메인 접속 테스트 완료
- [ ] API 엔드포인트 테스트 완료

## 🆘 문제 해결

### MongoDB 문제 해결
```bash
# MongoDB 문제 진단 및 해결
chmod +x deployment/scripts/mongodb-troubleshoot.sh
sudo ./deployment/scripts/mongodb-troubleshoot.sh
```

### 일반적인 문제들
1. **SSL 인증서 오류**: `deployment/scripts/setup-ssl.sh` 재실행
2. **Nginx 설정 오류**: `sudo nginx -t`로 설정 테스트
3. **권한 문제**: `sudo chown -R labsemble:www-data /var/www/labsemble`

### 로그 확인
```bash
# Nginx 로그
sudo tail -f /var/log/nginx/error.log

# PM2 로그
pm2 logs labsemble-server

# Lightsail 모니터링 로그
sudo tail -f /var/log/lightsail-monitor.log

# 시스템 로그
sudo journalctl -u nginx -f
```

## 📊 모니터링 및 백업

### **자동 모니터링**
```bash
# 수동 모니터링 실행
sudo /usr/local/bin/labsemble-monitor

# Lightsail 특화 모니터링
sudo /usr/local/bin/lightsail-monitor.sh

# 모니터링 로그 확인
sudo tail -f /var/log/labsemble/monitoring.log
sudo tail -f /var/log/lightsail-monitor.log
```

### **백업 관리**
```bash
# 수동 백업 실행
sudo /usr/local/bin/lightsail-backup.sh

# 백업 로그 확인
sudo tail -f /var/log/lightsail-backup.log

# 백업 파일 위치
ls -la /var/backups/labsemble/
```

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. 로그 파일 확인
2. 서비스 상태 확인
3. 방화벽 설정 확인
4. 도메인 DNS 설정 확인
5. Lightsail 콘솔에서 인스턴스 상태 확인

---

**LABSEMBLE** - AWS Lightsail에서 혁신적인 제조 솔루션을 제공합니다! ☁️🎨✨ 