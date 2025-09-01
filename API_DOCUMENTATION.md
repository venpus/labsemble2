# Labsemble API 문서

## 개요
Labsemble 제조업 관리 시스템의 REST API 문서입니다.

**Base URL**: `http://localhost:5000/api`

**시간대**: GMT+9 (한국 시간)

---

## 인증 (Authentication)

### JWT 토큰
대부분의 API는 JWT 토큰 인증이 필요합니다. 헤더에 다음을 포함하세요:
```
Authorization: Bearer <your-jwt-token>
```

---

## 1. 인증 API (`/auth`)

### 1.1 회원가입
```http
POST /api/auth/register
```

**요청 본문:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "companyName": "string",
  "contactPerson": "string",
  "phone": "string",
  "partnerName": "string (optional)"
}
```

**응답:**
```json
{
  "message": "회원가입이 완료되었습니다!",
  "token": "jwt-token",
  "user": {
    "id": "number",
    "username": "string",
    "email": "string",
    "companyName": "string",
    "contactPerson": "string",
    "isAdmin": "boolean",
    "partnerName": "string"
  }
}
```

### 1.2 로그인
```http
POST /api/auth/login
```

**요청 본문:**
```json
{
  "username": "string",
  "password": "string"
}
```

**응답:**
```json
{
  "message": "로그인 성공",
  "token": "jwt-token",
  "user": {
    "id": "number",
    "username": "string",
    "email": "string",
    "companyName": "string",
    "contactPerson": "string",
    "isAdmin": "boolean",
    "partnerName": "string"
  }
}
```

### 1.3 관리자 회원가입
```http
POST /api/auth/admin/register
```

---

## 2. MJ 프로젝트 API (`/mj-project`)

### 2.1 프로젝트 등록
```http
POST /api/mj-project/register
```

**인증**: 필요
**파일 업로드**: 이미지 파일 (최대 10개)

**요청 본문 (multipart/form-data):**
```
projectName: string
description: string
quantity: number
targetPrice: number
referenceLinks: string (JSON)
selectedUserId: number (optional)
images: file[]
```

### 2.2 프로젝트 목록 조회
```http
GET /api/mj-project
```

**인증**: 필요
**쿼리 파라미터:**
- `page`: 페이지 번호
- `limit`: 페이지당 항목 수
- `search`: 검색어
- `status`: 상태 필터

### 2.3 프로젝트 상세 조회
```http
GET /api/mj-project/:id
```

### 2.4 실제 이미지 업로드
```http
POST /api/mj-project/:id/real-images
```

**인증**: 필요
**파일 업로드**: 이미지/비디오 파일 (최대 10개)

### 2.5 실제 이미지 조회
```http
GET /api/mj-project/:id/real-images
```

### 2.6 실제 이미지 삭제
```http
DELETE /api/mj-project/:id/real-images/:imageId
```

### 2.7 배송 정보 등록
```http
POST /api/mj-project/:id/delivery
```

### 2.8 결제 정보 등록
```http
POST /api/mj-project/:id/payment
```

### 2.9 패킹 리스트 등록
```http
POST /api/mj-project/:id/packing-list
```

### 2.10 패킹 리스트 삭제
```http
DELETE /api/mj-project/:id/packing-list
```

### 2.11 입고 수량 업데이트
```http
PUT /api/mj-project/:id/entry-quantity
```

### 2.12 프로젝트 삭제
```http
DELETE /api/mj-project/:id
```

### 2.13 물류 정보 조회
```http
GET /api/mj-project/:id/logistic
```

### 2.14 주문 이벤트 캘린더
```http
GET /api/mj-project/calendar/order-events
```

### 2.15 물류 이벤트 캘린더
```http
GET /api/mj-project/calendar/logistics-events
```

### 2.16 선지급 일정 조회
```http
GET /api/mj-project/advance-payment-schedule
```

---

## 3. 창고 관리 API (`/warehouse`)

### 3.1 입고 등록
```http
POST /api/warehouse/entries
```

### 3.2 프로젝트별 입고 조회
```http
GET /api/warehouse/project/:projectId/entries
```

### 3.3 입고 정보 수정
```http
PUT /api/warehouse/entries/:entryId
```

### 3.4 입고 삭제
```http
DELETE /api/warehouse/entries/:entryId
```

### 3.5 이미지 업로드
```http
POST /api/warehouse/upload-images
```

### 3.6 이미지 삭제
```http
DELETE /api/warehouse/delete-image/:imageId
```

### 3.7 프로젝트별 이미지 조회
```http
GET /api/warehouse/project/:projectId/images
```

### 3.8 프로젝트별 총 수량 조회
```http
GET /api/warehouse/project/:projectId/total-quantity
```

### 3.9 이미지 파일 조회
```http
GET /api/warehouse/image/:filename
```

### 3.10 잔여 수량이 있는 제품 조회
```http
GET /api/warehouse/products-with-remain-quantity
```

### 3.11 입고 수량이 있는 제품 조회
```http
GET /api/warehouse/products-with-entry-quantity
```

### 3.12 재고가 있는 제품 조회
```http
GET /api/warehouse/products-with-stock
```

---

## 4. 패킹 리스트 API (`/packing-list`)

### 4.1 자동 저장
```http
POST /api/packing-list/auto-save
```

### 4.2 패킹 코드별 조회
```http
GET /api/packing-list/by-packing-code/:packingCode
```

### 4.3 패킹 리스트 조회
```http
GET /api/packing-list
```

### 4.4 패킹 리스트 삭제
```http
DELETE /api/packing-list/:id
```

### 4.5 패킹 코드별 삭제
```http
DELETE /api/packing-list/packing-code/:packingCode
```

### 4.6 프로젝트 출고 수량 업데이트
```http
POST /api/packing-list/update-project-export-quantity
```

### 4.7 프로젝트 출고 수량 계산
```http
POST /api/packing-list/calculate-project-export-quantity
```

---

## 5. 재무 관리 API (`/finance`)

### 5.1 수입 등록
```http
POST /api/finance/incoming
```

### 5.2 수입 목록 조회
```http
GET /api/finance/incoming
```

### 5.3 수입 상세 조회
```http
GET /api/finance/incoming/:id
```

### 5.4 수입 수정
```http
PUT /api/finance/incoming/:id
```

### 5.5 수입 삭제
```http
DELETE /api/finance/incoming/:id
```

### 5.6 지출 등록
```http
POST /api/finance/expense
```

### 5.7 지출 목록 조회
```http
GET /api/finance/expense
```

### 5.8 선지급 조회
```http
GET /api/finance/advance-payment
```

### 5.9 총 수입 조회
```http
GET /api/finance/total-amount
```

### 5.10 총 수수료 조회
```http
GET /api/finance/total-fee
```

### 5.11 미지급 선지급 조회
```http
GET /api/finance/unpaid-advance
```

### 5.12 미지급 잔금 조회
```http
GET /api/finance/unpaid-balance
```

### 5.13 선지급 일정 조회
```http
GET /api/finance/advance-payment-schedule
```

### 5.14 잔금 지급 일정 조회
```http
GET /api/finance/balance-payment-schedule
```

---

## 6. 물류 결제 API (`/logistic-payment`)

### 6.1 결제 정보 업데이트
```http
PUT /api/logistic-payment/update
```

### 6.2 날짜별 결제 조회
```http
GET /api/logistic-payment/by-date/:date
```

### 6.3 날짜별 요약 조회
```http
GET /api/logistic-payment/summary-by-date/:date
```

### 6.4 총 배송 비용 조회
```http
GET /api/logistic-payment/total-shipping-cost
```

### 6.5 미지급 배송 비용 조회
```http
GET /api/logistic-payment/unpaid-shipping-cost
```

### 6.6 배송 결제 일정 조회
```http
GET /api/logistic-payment/shipping-payment-schedule
```

### 6.7 결제 정보 삭제
```http
DELETE /api/logistic-payment/:id
```

---

## 7. 사용자 관리 API (`/users`)

### 7.1 내 정보 조회
```http
GET /api/users/me
```

### 7.2 사용자 목록 조회
```http
GET /api/users
```

### 7.3 사용자 상세 조회
```http
GET /api/users/:id
```

### 7.4 사용자 생성
```http
POST /api/users
```

### 7.5 사용자 수정
```http
PUT /api/users/:id
```

### 7.6 사용자 삭제
```http
DELETE /api/users/:id
```

---

## 8. 파트너 관리 API (`/partners`)

### 8.1 파트너 목록 조회
```http
GET /api/partners
```

### 8.2 파트너 상세 조회
```http
GET /api/partners/:id
```

### 8.3 파트너 생성
```http
POST /api/partners
```

### 8.4 파트너 수정
```http
PUT /api/partners/:id
```

### 8.5 파트너 삭제
```http
DELETE /api/partners/:id
```

---

## 9. 제품 관리 API (`/products`)

### 9.1 제품 목록 조회
```http
GET /api/products
```

### 9.2 제품 상세 조회
```http
GET /api/products/:id
```

### 9.3 카테고리별 제품 조회
```http
GET /api/products/category/:category
```

---

## 10. 견적 관리 API (`/quotations`)

### 10.1 견적 생성
```http
POST /api/quotations
```

### 10.2 견적 목록 조회
```http
GET /api/quotations
```

### 10.3 견적 상세 조회
```http
GET /api/quotations/:id
```

---

## 11. 시스템 API

### 11.1 헬스 체크
```http
GET /api/health
```

**응답:**
```json
{
  "status": "OK",
  "message": "Manufacturing API is running"
}
```

### 11.2 마이그레이션 상태 확인
```http
GET /api/migration/status
```

---

## 에러 응답 형식

```json
{
  "error": "에러 메시지"
}
```

## 파일 업로드

### 지원하는 파일 형식
- **이미지**: `image/*` (JPG, PNG, GIF 등)
- **비디오**: `video/*` (MP4, AVI 등)

### 파일 크기 제한
- 최대 파일 크기: 10MB
- 최대 파일 개수: 10개 (엔드포인트별로 다름)

---

## 인증 미들웨어

대부분의 API는 JWT 토큰 인증이 필요합니다. 토큰이 유효하지 않거나 만료된 경우:

```json
{
  "error": "인증이 필요합니다."
}
```

---

## 개발 환경 설정

1. 서버 실행:
```bash
cd server
npm install
npm start
```

2. 환경 변수 설정:
```bash
cp env.example .env
# .env 파일을 편집하여 데이터베이스 설정 등을 구성
```

---

## 참고사항

- 모든 날짜/시간은 GMT+9 (한국 시간) 기준입니다.
- 파일 업로드 시 multipart/form-data 형식을 사용합니다.
- API 응답은 JSON 형식입니다.
- 에러 발생 시 적절한 HTTP 상태 코드와 함께 에러 메시지가 반환됩니다. 