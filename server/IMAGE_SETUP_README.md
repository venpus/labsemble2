# 🖼️ 이미지 설정 가이드

## 📋 개요

이 문서는 Labsemble 프로젝트의 이미지 업로드 및 표시 설정에 대한 가이드입니다.

## 🏗️ 아키텍처

### 이미지 업로드 흐름
1. **클라이언트** → 이미지 선택 및 `FormData` 생성
2. **서버** → `multer`를 통해 이미지 저장
3. **데이터베이스** → 이미지 메타데이터 저장
4. **정적 파일 서빙** → `/images` 경로로 이미지 제공

### 폴더 구조
```
server/
├── uploads/
│   └── project/
│       └── mj/
│           ├── registImage/     # 프로젝트 등록 이미지
│           └── realImage/       # 실제 제품 이미지
```

## ⚙️ 설정 파일

### `server/config/config.js`
- **개발환경**: `http://localhost:5000/images`
- **상용환경**: `https://labsemble.com/images`
- **자동 환경 감지**: 호스트명, IP 주소 기반

### 환경 변수 (선택사항)
```bash
NODE_ENV=production
IMAGE_BASE_URL=https://labsemble.com/images
STATIC_BASE_URL=https://labsemble.com
CORS_ORIGIN=https://labsemble.com
```

## 🔧 문제 해결

### 이미지가 보이지 않는 경우

#### 1. 업로드 경로 확인
```bash
cd /path/to/your/app/server
node test-config.js
```

#### 2. 디버그 엔드포인트 확인
```bash
curl "https://labsemble.com/api/warehouse/debug/images"
```

#### 3. 폴더 권한 확인
```bash
ls -la /var/www/labsemble/server/uploads/
chmod -R 755 /var/www/labsemble/server/uploads/
```

#### 4. PM2 재시작
```bash
pm2 restart labsemble-server
```

### 일반적인 문제들

#### A. 업로드 폴더가 잘못된 위치에 생성됨
- **원인**: 상대 경로 사용
- **해결**: `config.js`에서 절대 경로 사용

#### B. 이미지 URL이 잘못됨
- **원인**: 환경별 설정 미적용
- **해결**: `NODE_ENV` 설정 또는 자동 감지 확인

#### C. CORS 오류
- **원인**: 허용된 origin 설정 오류
- **해결**: `config.js`의 `corsOrigin` 확인

## 🧪 테스트

### 설정 테스트
```bash
node test-config.js
```

### 이미지 업로드 테스트
1. 프로젝트 등록 페이지에서 이미지 업로드
2. 업로드된 이미지가 올바른 폴더에 저장되는지 확인
3. `ProjectSearchModal`에서 이미지가 표시되는지 확인

### API 테스트
```bash
# 이미지 폴더 상태 확인
curl "https://labsemble.com/api/warehouse/debug/images"

# 프로젝트 목록 조회 (이미지 포함)
curl "https://labsemble.com/api/warehouse/products-with-remain-quantity" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📝 로그 확인

### 서버 로그
```bash
pm2 logs labsemble-server --lines 50
```

### 주요 로그 메시지
- `🌐 [Config] 호스트명으로 상용서버 감지`
- `⚙️ [Config] 환경 설정 완료`
- `📁 [Config] 현재 작업 디렉토리`
- `🌐 [Config] 상용서버 감지, ecosystem cwd 사용`

## 🔄 업데이트 히스토리

- **2025-09-01**: 자동 환경 감지 및 절대 경로 설정 추가
- **2025-09-01**: 이미지 디버그 엔드포인트 추가
- **2025-09-01**: 설정 테스트 스크립트 개선

## 📞 지원

문제가 지속되는 경우:
1. `test-config.js` 실행 결과 공유
2. `/api/warehouse/debug/images` 응답 공유
3. 서버 로그 공유 