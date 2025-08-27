#!/bin/bash

# 🔄 LABSEMBLE 업데이트 배포 스크립트
# 기존 배포된 애플리케이션 업데이트용

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 로그 함수
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 환경 변수
APP_NAME="labsemble"
APP_USER="labsemble"
APP_DIR="/var/www/labsemble"
SERVER_PORT="5000"

# 백업 생성
create_backup() {
    log_info "💾 백업 생성 중..."
    
    BACKUP_DIR="/var/backups/labsemble"
    BACKUP_NAME="labsemble-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    sudo mkdir -p $BACKUP_DIR
    
    # 애플리케이션 디렉토리 백업
    cd $APP_DIR
    sudo tar -czf $BACKUP_DIR/$BACKUP_NAME --exclude=node_modules --exclude=logs .
    
    # 데이터베이스 백업
    DB_BACKUP_NAME="labsemble-db-$(date +%Y%m%d-%H%M%S).sql"
    sudo mysqldump -u root -p$DB_PASSWORD labsemble > $BACKUP_DIR/$DB_BACKUP_NAME
    
    log_success "백업 완료: $BACKUP_DIR/$BACKUP_NAME"
    log_success "데이터베이스 백업 완료: $BACKUP_DIR/$DB_BACKUP_NAME"
}

# 코드 업데이트
update_code() {
    log_info "📥 코드 업데이트 중..."
    
    cd $APP_DIR
    
    # Git 상태 확인
    if [ -d ".git" ]; then
        # 변경사항 확인
        if ! git diff-index --quiet HEAD --; then
            log_warning "로컬 변경사항이 있습니다. 백업 후 계속합니다."
            git stash
        fi
        
        # 원격 저장소에서 최신 코드 가져오기
        git fetch origin
        git reset --hard origin/main
        
        log_success "코드 업데이트 완료"
    else
        log_error "Git 저장소를 찾을 수 없습니다."
        exit 1
    fi
}

# 의존성 업데이트
update_dependencies() {
    log_info "📦 의존성 업데이트 중..."
    
    cd $APP_DIR
    
    # 클라이언트 의존성 업데이트
    cd client
    npm ci --production
    cd ..
    
    # 서버 의존성 업데이트
    cd server
    npm ci --production
    cd ..
    
    log_success "의존성 업데이트 완료"
}

# 클라이언트 빌드
build_client() {
    log_info "🏗️  클라이언트 빌드 중..."
    
    cd $APP_DIR/client
    
    # 프로덕션 빌드
    npm run build
    
    cd ..
    
    log_success "클라이언트 빌드 완료"
}

# 서버 재시작
restart_server() {
    log_info "🔄 서버 재시작 중..."
    
    cd $APP_DIR
    
    # PM2로 서버 재시작
    pm2 restart labsemble-server
    
    # 서버 상태 확인
    sleep 5
    
    if pm2 list | grep -q "labsemble-server.*online"; then
        log_success "서버 재시작 완료"
    else
        log_error "서버 재시작 실패"
        exit 1
    fi
}

# 데이터베이스 마이그레이션
run_migrations() {
    log_info "🗄️  데이터베이스 마이그레이션 실행 중..."
    
    cd $APP_DIR/server
    
    # 마이그레이션 실행
    npm run migrate
    
    log_success "데이터베이스 마이그레이션 완료"
}

# 업데이트 검증
verify_update() {
    log_info "🔍 업데이트 검증 중..."
    
    # 서버 상태 확인
    if pm2 list | grep -q "labsemble-server.*online"; then
        log_success "PM2 서버 실행 중"
    else
        log_error "PM2 서버 실행 실패"
        return 1
    fi
    
    # API 응답 확인
    sleep 3
    if curl -f http://localhost:$SERVER_PORT/api/health > /dev/null 2>&1; then
        log_success "API 서버 응답 확인"
    else
        log_error "API 서버 응답 실패"
        return 1
    fi
    
    # Nginx 상태 확인
    if sudo systemctl is-active --quiet nginx; then
        log_success "Nginx 실행 중"
    else
        log_error "Nginx 실행 실패"
        return 1
    fi
    
    log_success "모든 검증 완료!"
}

# 롤백 함수
rollback() {
    log_warning "🔄 롤백 실행 중..."
    
    cd $APP_DIR
    
    # PM2 서버 중지
    pm2 stop labsemble-server
    
    # 백업에서 복원
    LATEST_BACKUP=$(ls -t /var/backups/labsemble/labsemble-*.tar.gz | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        sudo tar -xzf $LATEST_BACKUP -C $APP_DIR
        log_success "코드 롤백 완료"
    fi
    
    # 데이터베이스 롤백
    LATEST_DB_BACKUP=$(ls -t /var/backups/labsemble/labsemble-db-*.sql | head -1)
    if [ -n "$LATEST_DB_BACKUP" ]; then
        sudo mysql -u root -p$DB_PASSWORD labsemble < $LATEST_DB_BACKUP
        log_success "데이터베이스 롤백 완료"
    fi
    
    # 서버 재시작
    pm2 start ecosystem.config.js --env production
    
    log_warning "롤백이 완료되었습니다."
}

# 업데이트 요약
update_summary() {
    log_success "🎉 업데이트가 성공적으로 완료되었습니다!"
    echo ""
    echo "📋 업데이트 요약:"
    echo "   • 애플리케이션: $APP_NAME"
    echo "   • 업데이트 시간: $(date)"
    echo "   • 서버 상태: $(pm2 list | grep labsemble-server | awk '{print $10}')"
    echo ""
    echo "📊 모니터링:"
    echo "   • PM2 상태: pm2 status"
    echo "   • PM2 로그: pm2 logs labsemble-server"
    echo "   • Nginx 로그: sudo tail -f /var/log/nginx/access.log"
    echo ""
    echo "⚠️  문제 발생 시:"
    echo "   • 롤백: ./update.sh --rollback"
    echo "   • 로그 확인: pm2 logs labsemble-server --lines 100"
}

# 메인 실행
main() {
    log_info "🔄 LABSEMBLE 업데이트 시작"
    
    # MariaDB 비밀번호 입력
    read -s -p "MariaDB root 비밀번호를 입력하세요: " DB_PASSWORD
    echo ""
    
    if [ -z "$DB_PASSWORD" ]; then
        log_error "비밀번호를 입력해주세요."
        exit 1
    fi
    
    # 롤백 옵션 확인
    if [ "$1" = "--rollback" ]; then
        rollback
        exit 0
    fi
    
    # 각 단계 실행
    create_backup
    update_code
    update_dependencies
    build_client
    run_migrations
    restart_server
    verify_update
    update_summary
    
    log_success "🎉 업데이트가 성공적으로 완료되었습니다!"
}

# 스크립트 실행
main "$@" 