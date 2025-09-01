# Labsemble API 문서 사용법

## 📚 문서 종류

### 1. 마크다운 문서 (`API_DOCUMENTATION.md`)
- 전체 API 엔드포인트 목록과 설명
- 요청/응답 예시
- 인증 방법 및 에러 처리
- 개발 환경 설정 가이드

### 2. Swagger/OpenAPI 스펙 (`swagger.json`)
- 표준 OpenAPI 3.0 형식
- 자동 생성된 API 스키마
- 다른 도구와의 호환성

### 3. 웹 인터페이스 (`api-docs.html`)
- Swagger UI를 사용한 인터랙티브 문서
- API 테스트 기능 포함
- JWT 토큰 자동 관리

---

## 🚀 문서 보기 방법

### 방법 1: 웹 브라우저에서 HTML 문서 보기
```bash
# 프로젝트 루트 디렉토리에서
open api-docs.html
# 또는
start api-docs.html  # Windows
```

### 방법 2: 로컬 서버로 실행
```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .

# 그 후 브라우저에서 http://localhost:8000/api-docs.html 접속
```

### 방법 3: VS Code에서 마크다운 보기
- `API_DOCUMENTATION.md` 파일을 열고
- VS Code의 마크다운 프리뷰 기능 사용

---

## 🔧 API 테스트 방법

### 1. Swagger UI 사용 (권장)
1. `api-docs.html` 파일을 브라우저에서 열기
2. 원하는 API 엔드포인트 클릭
3. "Try it out" 버튼 클릭
4. 파라미터 입력 후 "Execute" 실행

### 2. Postman 사용
1. Postman에서 새 컬렉션 생성
2. `swagger.json` 파일을 import
3. 환경 변수 설정 (Base URL, JWT Token 등)

### 3. curl 명령어 사용
```bash
# 로그인 예시
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"password"}'

# 인증이 필요한 API 호출 예시
curl -X GET http://localhost:5000/api/mj-project \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔐 인증 설정

### JWT 토큰 관리
1. `/auth/login` API로 로그인
2. 응답에서 JWT 토큰 받기
3. 이후 API 호출 시 헤더에 토큰 포함:
   ```
   Authorization: Bearer <your-jwt-token>
   ```

### Swagger UI에서 자동 토큰 관리
- 로그인 API 호출 시 토큰이 자동으로 저장됨
- 이후 API 호출 시 자동으로 토큰이 포함됨

---

## 📋 주요 API 카테고리

### 1. 인증 (`/auth`)
- 회원가입, 로그인, 관리자 등록

### 2. MJ 프로젝트 (`/mj-project`)
- 프로젝트 CRUD, 이미지 업로드, 배송/결제 관리

### 3. 창고 관리 (`/warehouse`)
- 입고/출고 관리, 재고 조회, 이미지 관리

### 4. 패킹 리스트 (`/packing-list`)
- 패킹 리스트 생성, 조회, 삭제

### 5. 재무 관리 (`/finance`)
- 수입/지출 관리, 선지급/잔금 관리

### 6. 물류 결제 (`/logistic-payment`)
- 배송 비용 관리, 결제 일정 관리

### 7. 사용자 관리 (`/users`)
- 사용자 CRUD, 권한 관리

### 8. 파트너 관리 (`/partners`)
- 파트너 정보 관리

---

## 🛠️ 개발 환경 설정

### 서버 실행
```bash
cd server
npm install
npm start
```

### 환경 변수 설정
```bash
cp server/env.example server/.env
# .env 파일 편집
```

### 데이터베이스 설정
- MySQL/MariaDB 필요
- 환경 변수에서 데이터베이스 연결 정보 설정

---

## 📝 API 사용 예시

### 프로젝트 등록
```javascript
const formData = new FormData();
formData.append('projectName', '새 프로젝트');
formData.append('description', '프로젝트 설명');
formData.append('quantity', 100);
formData.append('targetPrice', 10000);
formData.append('images', fileInput.files[0]);

fetch('http://localhost:5000/api/mj-project/register', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

### 프로젝트 목록 조회
```javascript
fetch('http://localhost:5000/api/mj-project?page=1&limit=10', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

---

## 🔍 문제 해결

### CORS 에러
- 서버의 CORS 설정 확인
- 클라이언트 도메인이 허용 목록에 포함되어 있는지 확인

### 인증 에러
- JWT 토큰이 유효한지 확인
- 토큰이 만료되지 않았는지 확인
- 헤더 형식이 올바른지 확인

### 파일 업로드 에러
- 파일 크기가 제한을 초과하지 않았는지 확인
- 파일 형식이 지원되는지 확인
- multipart/form-data 형식으로 전송하는지 확인

---

## 📞 지원

API 관련 문의사항이 있으시면:
1. 이 문서를 먼저 확인해주세요
2. Swagger UI에서 API를 직접 테스트해보세요
3. 서버 로그를 확인하여 에러 원인을 파악해주세요

---

## 🔄 문서 업데이트

API가 변경될 때마다 다음 파일들을 업데이트해주세요:
1. `API_DOCUMENTATION.md` - 마크다운 문서
2. `swagger.json` - OpenAPI 스펙
3. `api-docs.html` - 웹 인터페이스 (필요시)

문서는 항상 최신 상태를 유지해야 합니다! 