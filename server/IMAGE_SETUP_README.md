# 🖼️ 이미지 설정 가이드

## 📋 개요
이 문서는 상용서버에서 이미지가 정상적으로 표시되도록 설정하는 방법을 설명합니다.

## 🔧 서버 설정 변경사항

### 1. 정적 파일 미들웨어 추가
- `server/index.js`에 `/images` 경로로 정적 파일 서빙 설정 추가
- CORS 헤더 및 캐싱 설정 포함

### 2. 환경별 이미지 URL 설정
- `server/config/config.js` 생성
- 개발/상용 환경별 이미지 URL 자동 설정

### 3. warehouse API 수정
- 프록시 엔드포인트 대신 직접 정적 파일 URL 사용
- 환경별 설정 적용

## 🌍 환경별 설정

### 개발 환경 (Development)
```bash
NODE_ENV=development
# 자동으로 http://localhost:5000/images 사용
```

### 상용 환경 (Production)
```bash
NODE_ENV=production
IMAGE_BASE_URL=https://yourdomain.com/images
STATIC_BASE_URL=https://yourdomain.com
```

## 📁 파일 구조
```
server/
├── config/
│   └── config.js          # 환경별 설정
├── uploads/
│   └── project/
│       └── mj/
│           └── registImage/  # 프로젝트 등록 이미지
├── index.js               # 정적 파일 미들웨어 설정
└── routes/
    └── warehouse.js       # 이미지 URL 생성 로직
```

## 🚀 배포 시 주의사항

### 1. 환경 변수 설정
```bash
# .env 파일에 추가
NODE_ENV=production
IMAGE_BASE_URL=https://yourdomain.com/images
STATIC_BASE_URL=https://yourdomain.com
```

### 2. 이미지 폴더 권한
```bash
# 이미지 폴더 읽기 권한 확인
chmod -R 755 uploads/project/mj/registImage
```

### 3. 웹서버 설정 (Nginx/Apache)
```nginx
# Nginx 예시
location /images/ {
    alias /path/to/your/app/uploads/project/mj/registImage/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🔍 문제 해결

### 이미지가 보이지 않는 경우
1. **환경 변수 확인**: `NODE_ENV`, `IMAGE_BASE_URL` 설정 확인
2. **폴더 권한 확인**: `uploads/project/mj/registImage` 폴더 접근 권한
3. **웹서버 설정 확인**: 정적 파일 서빙 설정 확인
4. **브라우저 개발자 도구**: 네트워크 탭에서 이미지 요청 상태 확인

### 로그 확인
```bash
# 서버 로그에서 이미지 요청 확인
tail -f server.log | grep "images"
```

## 📝 변경 사항 요약

1. ✅ 정적 파일 미들웨어 추가 (`/images` 경로)
2. ✅ 환경별 설정 파일 생성
3. ✅ warehouse API에서 환경별 URL 생성
4. ✅ 클라이언트에서 이미지 로드 실패 시 대체 처리
5. ✅ 환경 변수 설정 가이드 추가

## 🔄 다음 단계

1. 서버 재시작
2. 환경 변수 설정 (상용 환경)
3. 이미지 폴더 권한 확인
4. 테스트 및 검증 