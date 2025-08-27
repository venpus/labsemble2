# Delivery 컴포넌트

납기 일정을 관리하는 컴포넌트 모음입니다.

## 구조

```
Delivery/
├── Delivery.js          # 메인 컴포넌트
├── DeliveryHeader.js    # 헤더 컴포넌트
├── DeliverySchedule.js  # 납기 일정 관리 컴포넌트
├── DeliveryStatus.js    # 납기 상태 요약 컴포넌트
├── index.js            # 컴포넌트 export
└── README.md           # 이 파일
```

## 컴포넌트 설명

### Delivery.js (메인 컴포넌트)
- 전체 Delivery 컴포넌트의 상태 관리
- Admin 권한 확인
- Project 데이터 동기화
- 하위 컴포넌트들 조합

### DeliveryHeader.js
- 납기 일정 제목 및 설명
- 권한 상태 표시 (관리자/일반 사용자)

### DeliverySchedule.js
- 발주 완료 상태 관리
- 예상 공장 출고일 설정
- 공장 출고 완료 상태 관리
- 실시간 DB 저장

### DeliveryStatus.js
- 전체 진행률 표시
- 납기 상태 요약
- 주요 일정 요약
- 납기 일정 분석

## 주요 기능

1. **발주 관리**
   - 발주 완료 체크
   - 실제 발주일 자동 기록

2. **공장 출고 관리**
   - 예상 출고일 설정
   - 실제 출고 완료 체크
   - 실제 출고일 자동 기록

3. **진행률 추적**
   - 시각적 진행률 바
   - 단계별 상태 표시

4. **권한 관리**
   - Admin 사용자만 수정 가능
   - 실시간 권한 확인

## 사용법

```jsx
import { Delivery } from './components/Project/MJ/Details/Delivery';

// ProjectDetails.js에서 사용
<Delivery project={project} />
```

## Props

### Delivery (메인)
- `project`: 프로젝트 데이터 객체

### 하위 컴포넌트들
- `isAdmin`: 관리자 권한 여부
- `isAdminLoading`: 권한 확인 로딩 상태
- `onUpdate`: 상태 업데이트 함수
- `onSave`: DB 저장 함수

## 데이터 구조

```javascript
{
  actualOrderDate: '2024-01-01',           // 실제 발주일
  expectedFactoryShippingDate: '2024-02-01', // 예상 공장 출고일
  actualFactoryShippingDate: '2024-02-01',   // 실제 공장 출고일
  isOrderCompleted: true,                   // 발주 완료 여부
  isFactoryShippingCompleted: true          // 공장 출고 완료 여부
}
``` 