# 🔄 LABSEMBLE 코드 업데이트 후 서버 조치 가이드

## 📋 **개요**

이 가이드는 LABSEMBLE 프로젝트의 코드를 업데이트한 후, AWS Lightsail 서버에서 취해야 할 모든 조치를 단계별로 안내합니다. 자동화된 스크립트 사용과 수동 업데이트 방법을 모두 포함합니다.

---

## 🚀 **1단계: 서버 접속 및 현재 상태 확인**

### **1.1 서버 접속**
```bash
# SSH를 통한 서버 접속
ssh ubuntu@your-server-ip

# 또는 키 파일을 사용한 접속
ssh -i your-key.pem ubuntu@your-server-ip
```

### **1.2 현재 실행 중인 서비스 상태 확인**
```bash
# PM2 프로세스 상태 확인
pm2 status

# Nginx 서비스 상태 확인
sudo systemctl status nginx

# MariaDB 서비스 상태 확인
sudo systemctl status mariadb

# 전체 시스템 상태 요약
./monitor.sh
```

---

## 🔄 **2단계: 자동 업데이트 스크립트 실행 (권장)**

### **2.1 스크립트 권한 확인 및 설정**
```bash
# 애플리케이션 디렉토리로 이동
cd /var/www/labsemble

# 스크립트 파일 권한 확인
ls -la *.sh

# 권한이 없다면 실행 권한 부여
chmod +x update.sh
chmod +x monitor.sh
```

### **2.2 자동 업데이트 실행**
```bash
# 자동 업데이트 스크립트 실행
./update.sh
```

**업데이트 스크립트가 자동으로 수행하는 작업:**
- ✅ **백업 생성**: 기존 코드 및 데이터베이스 자동 백업
- ✅ **코드 업데이트**: Git에서 최신 코드 자동 가져오기
- ✅ **의존성 업데이트**: npm 패키지 자동 업데이트
- ✅ **클라이언트 재빌드**: React 앱 자동 빌드
- ✅ **데이터베이스 마이그레이션**: DB 스키마 자동 업데이트
- ✅ **서버 재시작**: PM2 프로세스 자동 재시작
- ✅ **업데이트 검증**: 모든 서비스 정상 작동 확인

---

## 🛠️ **3단계: 수동 업데이트 (스크립트 사용 불가 시)**

### **3.1 코드 업데이트**
```bash
# 애플리케이션 디렉토리로 이동
cd /var/www/labsemble

# 현재 Git 상태 확인
git status

# 원격 저장소에서 최신 코드 가져오기
git fetch origin

# 메인 브랜치로 체크아웃
git checkout main

# 최신 코드로 업데이트
git reset --hard origin/main

# 또는 특정 브랜치로 업데이트
git checkout develop
git pull origin develop
```

### **3.2 의존성 업데이트**
```bash
# 클라이언트 의존성 업데이트
cd client
npm ci --production
cd ..

# 서버 의존성 업데이트
cd server
npm ci --production
cd ..

# 또는 개발 의존성 포함 설치
npm install
```

### **3.3 클라이언트 재빌드**
```bash
# 클라이언트 디렉토리로 이동
cd client

# 프로덕션 빌드 실행
npm run build

# 빌드 결과 확인
ls -la build/

# 상위 디렉토리로 복귀
cd ..
```

### **3.4 데이터베이스 마이그레이션**
```bash
# 서버 디렉토리로 이동
cd server

# 마이그레이션 실행
npm run migrate

# 마이그레이션 상태 확인
npm run migration:status

# 상위 디렉토리로 복귀
cd ..
```

---

## ⚡ **4단계: 서버 재시작**

### **4.1 PM2로 서버 재시작**
```bash
# 현재 실행 중인 프로세스 확인
pm2 list

# 서버 재시작 (권장)
pm2 restart labsemble-server

# 또는 완전히 중지 후 시작
pm2 stop labsemble-server
pm2 start ecosystem.config.js --env production

# PM2 상태 확인
pm2 status

# PM2 로그 확인
pm2 logs labsemble-server --lines 50
```

### **4.2 Nginx 설정 재로드 (필요시)**
```bash
# Nginx 설정 파일 문법 검사
sudo nginx -t

# 설정 재로드 (서비스 중단 없음)
sudo systemctl reload nginx

# 또는 완전 재시작
sudo systemctl restart nginx

# Nginx 상태 확인
sudo systemctl status nginx
```

### **4.3 MariaDB 재시작 (필요시)**
```bash
# MariaDB 상태 확인
sudo systemctl status mariadb

# 필요시 재시작
sudo systemctl restart mariadb

# 재시작 후 상태 확인
sudo systemctl status mariadb
```

---

## 🔍 **5단계: 업데이트 검증**

### **5.1 서비스 상태 확인**
```bash
# PM2 서버 상태 확인
pm2 list | grep labsemble-server

# Nginx 서비스 상태 확인
sudo systemctl is-active nginx

# MariaDB 서비스 상태 확인
sudo systemctl is-active mariadb

# 전체 서비스 상태 요약
./monitor.sh
```

### **5.2 API 응답 테스트**
```bash
# Health Check API 테스트 (로컬)
curl -f http://localhost:5000/api/health

# Health Check API 테스트 (도메인)
curl -f http://labsemble.com/api/health

# API 응답 시간 테스트
curl -w "@-" -o /dev/null -s "http://localhost:5000/api/health" <<< "time_total: %{time_total}s"
```

### **5.3 웹사이트 접속 테스트**
```bash
# 웹사이트 HTTP 응답 확인
curl -I http://labsemble.com

# 메인 페이지 콘텐츠 확인
curl -s http://labsemble.com | head -20

# 브라우저에서 직접 접속 테스트
# http://labsemble.com
```

### **5.4 파일 업로드 테스트**
```bash
# 테스트 파일 생성
echo "test content" > test.txt

# 파일 업로드 API 테스트
curl -X POST -F "file=@test.txt" http://labsemble.com/api/warehouse/upload-images

# 테스트 파일 정리
rm test.txt
```

---

## 📊 **6단계: 로그 확인 및 문제 해결**

### **6.1 PM2 로그 확인**
```bash
# 실시간 로그 확인
pm2 logs labsemble-server

# 최근 로그만 확인
pm2 logs labsemble-server --lines 100

# 에러 로그만 확인
pm2 logs labsemble-server --err --lines 50

# 특정 시간대 로그 확인
pm2 logs labsemble-server --timestamp
```

### **6.2 Nginx 로그 확인**
```bash
# 접속 로그 실시간 확인
sudo tail -f /var/log/nginx/access.log

# 에러 로그 실시간 확인
sudo tail -f /var/log/nginx/error.log

# 최근 에러 로그 확인
sudo tail -100 /var/log/nginx/error.log | grep -i error
```

### **6.3 시스템 로그 확인**
```bash
# Nginx 서비스 로그
sudo journalctl -u nginx -f

# MariaDB 서비스 로그
sudo journalctl -u mariadb -f

# 시스템 전체 로그
sudo journalctl -f
```

### **6.4 애플리케이션 로그 확인**
```bash
# 애플리케이션 로그 디렉토리 확인
cd /var/www/labsemble
ls -la logs/

# 로그 파일 내용 확인
tail -f logs/err.log
tail -f logs/out.log
tail -f logs/combined.log
```

---

## 🔄 **7단계: 문제 발생 시 롤백**

### **7.1 자동 롤백 (스크립트 사용)**
```bash
# 롤백 실행
./update.sh --rollback

# 롤백 후 상태 확인
pm2 status
curl -f http://localhost:5000/api/health
```

### **7.2 수동 롤백**
```bash
# PM2 서버 중지
pm2 stop labsemble-server

# 백업 디렉토리 확인
ls -la /var/backups/labsemble/

# 최신 백업 파일 확인
ls -t /var/backups/labsemble/labsemble-*.tar.gz | head -1

# 코드 백업에서 복원
cd /var/www/labsemble
sudo tar -xzf /var/backups/labsemble/labsemble-*.tar.gz

# 데이터베이스 백업 확인
ls -t /var/backups/labsemble/labsemble-db-*.sql | head -1

# 데이터베이스 롤백
sudo mysql -u root -p labsemble < /var/backups/labsemble/labsemble-db-*.sql

# 서버 재시작
pm2 start ecosystem.config.js --env production

# 롤백 후 상태 확인
pm2 status
curl -f http://localhost:5000/api/health
```

---

## 📈 **8단계: 성능 모니터링**

### **8.1 시스템 리소스 모니터링**
```bash
# 실시간 시스템 모니터링
htop

# CPU 사용률 확인
top -bn1 | grep "Cpu(s)"

# 메모리 사용률 확인
free -h

# 디스크 사용률 확인
df -h

# 네트워크 연결 상태
netstat -an | grep :5000
```

### **8.2 애플리케이션 성능 모니터링**
```bash
# PM2 성능 모니터링
pm2 monit

# 실시간 모니터링 스크립트
./monitor.sh --realtime

# 성능 지표 확인
./monitor.sh
```

### **8.3 데이터베이스 성능 확인**
```bash
# MariaDB 프로세스 확인
ps aux | grep mariadb

# 데이터베이스 연결 수 확인
mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"

# 데이터베이스 크기 확인
mysql -u root -p -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.tables WHERE table_schema = 'labsemble' GROUP BY table_schema;"
```

---

## 🔐 **9단계: 보안 확인**

### **9.1 방화벽 상태 확인**
```bash
# UFW 방화벽 상태 확인
sudo ufw status

# 방화벽 규칙 확인
sudo ufw status numbered
```

### **9.2 열린 포트 확인**
```bash
# 현재 열린 포트 확인
sudo netstat -tlnp | grep LISTEN

# 특정 포트 상태 확인
sudo netstat -tlnp | grep :5000
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

### **9.3 SSH 접속 시도 확인**
```bash
# SSH 접속 시도 로그 확인
sudo tail -20 /var/log/auth.log | grep sshd

# 실패한 SSH 접속 시도 확인
sudo grep "Failed password" /var/log/auth.log | tail -10
```

---

## 📋 **10단계: 최종 검증 체크리스트**

### **기본 업데이트 검증**
- [ ] **코드 업데이트**: Git에서 최신 코드 확인 완료
- [ ] **의존성 설치**: npm 패키지 업데이트 완료
- [ ] **클라이언트 빌드**: React 앱 빌드 성공
- [ ] **데이터베이스 마이그레이션**: DB 스키마 업데이트 완료

### **서비스 상태 검증**
- [ ] **서버 재시작**: PM2 프로세스 정상 실행
- [ ] **Nginx 설정**: 웹서버 정상 작동
- [ ] **MariaDB 연결**: 데이터베이스 정상 연결

### **기능 검증**
- [ ] **API 응답**: Health Check API 정상 응답
- [ ] **웹사이트 접속**: 메인 페이지 정상 로드
- [ ] **파일 업로드**: 업로드 기능 정상 작동
- [ ] **데이터베이스**: CRUD 작업 정상 수행

### **성능 및 보안 검증**
- [ ] **로그 확인**: 에러 로그 없음
- [ ] **성능 모니터링**: 시스템 리소스 정상
- [ ] **보안 확인**: 방화벽 및 포트 상태 정상

---

## 🚨 **문제 발생 시 즉시 확인사항**

### **1. 서버가 시작되지 않는 경우**
```bash
# PM2 로그 확인
pm2 logs labsemble-server --lines 100

# 수동으로 서버 시작 테스트
cd /var/www/labsemble/server
node index.js

# 환경 변수 확인
cat .env

# 데이터베이스 연결 테스트
mysql -u venpus -p labsemble
```

### **2. 데이터베이스 연결 오류**
```bash
# MariaDB 서비스 상태 확인
sudo systemctl status mariadb

# MariaDB 프로세스 확인
ps aux | grep mariadb

# 데이터베이스 연결 테스트
mysql -u venpus -p labsemble

# 데이터베이스 사용자 권한 확인
mysql -u root -p -e "SHOW GRANTS FOR 'venpus'@'localhost';"
```

### **3. 권한 문제**
```bash
# 파일 소유권 확인
ls -la /var/www/labsemble/

# 파일 권한 재설정
sudo chown -R labsemble:labsemble /var/www/labsemble
sudo chmod -R 755 /var/www/labsemble
sudo chmod 600 /var/www/labsemble/server/.env

# 업로드 디렉토리 권한 확인
ls -la /var/www/labsemble/server/uploads/
```

### **4. Nginx 오류**
```bash
# Nginx 설정 파일 문법 검사
sudo nginx -t

# Nginx 에러 로그 확인
sudo tail -f /var/log/nginx/error.log

# Nginx 프로세스 상태 확인
sudo systemctl status nginx
```

---

## 📊 **업데이트 후 모니터링 명령어**

### **전체 시스템 모니터링**
```bash
# 전체 시스템 상태 확인
./monitor.sh

# 실시간 모니터링
./monitor.sh --realtime

# 특정 모니터링 기능
./monitor.sh  # 메뉴 기반 모니터링
```

### **개별 서비스 모니터링**
```bash
# PM2 상태 및 로그
pm2 status
pm2 logs labsemble-server --lines 0

# Nginx 상태 및 로그
sudo systemctl status nginx
sudo tail -f /var/log/nginx/access.log

# MariaDB 상태
sudo systemctl status mariadb
```

### **성능 모니터링**
```bash
# 시스템 리소스 실시간 모니터링
htop

# 네트워크 연결 상태
netstat -an | grep :5000

# 디스크 사용률
df -h
```

---

## 🔧 **자주 발생하는 문제 및 해결방법**

### **1. 메모리 부족 오류**
```bash
# 메모리 사용률 확인
free -h

# PM2 메모리 제한 설정
pm2 start ecosystem.config.js --max-memory-restart 512M

# 불필요한 프로세스 정리
pm2 delete all
pm2 start ecosystem.config.js
```

### **2. 포트 충돌 오류**
```bash
# 포트 사용 상태 확인
sudo netstat -tlnp | grep :5000

# 포트를 사용하는 프로세스 확인
sudo lsof -i :5000

# PM2 프로세스 정리 후 재시작
pm2 delete all
pm2 start ecosystem.config.js
```

### **3. 파일 권한 오류**
```bash
# 업로드 디렉토리 권한 확인
ls -la /var/www/labsemble/server/uploads/

# 권한 재설정
sudo chown -R labsemble:labsemble /var/www/labsemble/server/uploads/
sudo chmod -R 755 /var/www/labsemble/server/uploads/
```

---

## 📞 **지원 및 문제 해결**

### **로그 분석 도구**
```bash
# 에러 로그 필터링
pm2 logs labsemble-server --err | grep -i error

# 특정 키워드로 로그 검색
pm2 logs labsemble-server | grep -i "database\|connection\|error"

# 로그 파일 크기 확인
du -sh /var/www/labsemble/logs/*
```

### **문제 해결 순서**
1. **로그 확인**: PM2, Nginx, MariaDB 로그 확인
2. **서비스 상태 확인**: 각 서비스의 실행 상태 확인
3. **권한 확인**: 파일 및 디렉토리 권한 확인
4. **설정 파일 확인**: 환경 변수 및 설정 파일 검증
5. **롤백 고려**: 문제가 지속되면 이전 버전으로 롤백

---

## 🎯 **성능 최적화 팁**

### **PM2 최적화**
```bash
# 클러스터 모드로 CPU 코어 수만큼 인스턴스 실행
pm2 start ecosystem.config.js -i max

# 메모리 제한 설정
pm2 start ecosystem.config.js --max-memory-restart 1G

# 자동 재시작 설정
pm2 start ecosystem.config.js --max-restarts 10
```

### **Nginx 최적화**
```nginx
# gzip 압축 활성화
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# 정적 파일 캐싱
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

**🎉 축하합니다! 코드 업데이트가 성공적으로 완료되었습니다!**

이제 LABSEMBLE 애플리케이션이 최신 코드로 업데이트되어 안전하게 실행되고 있습니다. 정기적인 모니터링을 통해 시스템의 안정성을 유지하시기 바랍니다.

**Happy Updating! 🚀** 