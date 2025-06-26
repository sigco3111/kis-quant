# KIS Quant Backend API Proxy

한국투자증권 API를 위한 백엔드 프록시 시스템입니다. 프론트엔드의 직접 API 호출을 방지하고, 암호화된 API 키를 안전하게 처리하여 KIS API를 호출하는 중간 계층을 제공합니다.

## 🏗️ 아키텍처

```
Frontend (React) → Backend Proxy (Vercel Functions) → KIS API
```

## 📁 디렉토리 구조

```
backend/
├── api/
│   └── kis/
│       ├── account-info.ts    # 계좌 정보 조회
│       ├── market-data.ts     # 시장 데이터 조회
│       └── orders.ts          # 주식 주문
├── utils/
│   ├── firebase-admin.ts      # 인증 및 유틸리티
│   ├── kis-client.ts          # KIS API 클라이언트
│   └── rate-limiter.ts        # Rate Limiting
├── package.json
├── tsconfig.json
├── vercel.json
└── test-api.js               # API 테스트 스크립트
```

## 🚀 주요 기능

### 1. API 프록시 엔드포인트

#### 계좌 정보 조회
- **URL**: `POST /api/kis/account-info`
- **기능**: 사용자 계좌 잔고 및 보유 종목 조회
- **Rate Limit**: 분당 100회

#### 시장 데이터 조회
- **URL**: `POST /api/kis/market-data`
- **기능**: 주식 현재가 및 시장 정보 조회
- **Rate Limit**: 분당 100회

#### 주식 주문
- **URL**: `POST /api/kis/orders`
- **기능**: 주식 매수/매도 주문 실행
- **Rate Limit**: 분당 30회 (엄격한 제한)

### 2. 보안 기능

- **API 키 암호화**: AES-256-CBC + PBKDF2 복호화
- **인증 검증**: Bearer 토큰 기반 인증
- **Rate Limiting**: IP 기반 요청 제한
- **CORS 설정**: 안전한 크로스 도메인 요청
- **에러 처리**: 표준화된 에러 응답

### 3. Rate Limiting

- **기본 제한**: 분당 100회 (일반 API)
- **엄격한 제한**: 분당 30회 (주문 API)
- **IP 기반**: 클라이언트 IP별 독립적 제한
- **메모리 기반**: 빠른 응답 (프로덕션에서는 Redis 권장)

## 📝 API 요청 형식

### 공통 헤더
```http
Authorization: Bearer <auth-token>
Content-Type: application/json
```

### 요청 본문 (공통)
```json
{
  "encryptedApiKey": {
    "salt": "hex-string",
    "iv": "hex-string", 
    "encrypted": "encrypted-string"
  },
  "encryptedSecret": {
    "salt": "hex-string",
    "iv": "hex-string",
    "encrypted": "encrypted-string"
  },
  "accountNumber": "12345678-01",
  "password": "decryption-password",
  "isPaper": false
}
```

### 시장 데이터 조회 추가 필드
```json
{
  "stockCode": "005930"
}
```

### 주문 추가 필드
```json
{
  "stockCode": "005930",
  "orderType": "buy",
  "quantity": 10,
  "price": 70000,
  "orderCondition": "00"
}
```

## 📊 응답 형식

### 성공 응답
```json
{
  "success": true,
  "data": { ... },
  "message": "성공 메시지",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 에러 응답
```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "에러 메시지"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Rate Limit 응답
```json
{
  "success": false,
  "error": {
    "code": 429,
    "message": "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
    "retryAfter": 60
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🛠️ 개발 환경 설정

### 1. 의존성 설치
```bash
cd backend
npm install
```

### 2. 환경변수 설정 (선택사항)
```bash
# .env 파일 생성
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_DATABASE_URL=your-database-url
```

### 3. 로컬 개발 서버 실행
```bash
npm run dev
```

### 4. API 테스트
```bash
node test-api.js
```

## 🚀 배포

### Vercel 배포
```bash
npm run deploy
```

### 환경변수 설정 (Vercel Dashboard)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_DATABASE_URL`
- `NODE_ENV=production`

## 🔒 보안 고려사항

### 1. API 키 보안
- ✅ 모든 API 키는 클라이언트에서 암호화되어 전송
- ✅ 서버에서 복호화 후 즉시 메모리에서 제거
- ✅ 비밀번호는 서버로 전송되지 않음

### 2. 인증 및 권한
- ✅ Bearer 토큰 기반 인증
- ✅ 요청별 인증 상태 확인
- ✅ 익명 인증 지원

### 3. Rate Limiting
- ✅ IP 기반 요청 제한
- ✅ API별 차등 제한
- ✅ 주문 API 엄격한 제한

### 4. 에러 처리
- ✅ 민감한 정보 노출 방지
- ✅ 표준화된 에러 응답
- ✅ 상세한 로깅 (민감 정보 제외)

## 📋 주문 조건 코드

| 코드 | 설명 |
|------|------|
| 00 | 지정가 |
| 01 | 시장가 |
| 02 | 조건부지정가 |

## 🧪 테스트

### 자동 테스트 실행
```bash
node test-api.js
```

### 수동 테스트 (curl)
```bash
# 계좌 정보 조회
curl -X POST http://localhost:3000/api/kis/account-info \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"encryptedApiKey": {...}, "password": "test"}'

# 시장 데이터 조회
curl -X POST http://localhost:3000/api/kis/market-data \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"encryptedApiKey": {...}, "stockCode": "005930", "password": "test"}'
```

## 🐛 문제 해결

### 1. 인증 실패 (401)
- Authorization 헤더 확인
- 토큰 형식 확인 (`Bearer <token>`)

### 2. API 키 복호화 실패 (400)
- 비밀번호 확인
- 암호화 데이터 형식 확인

### 3. Rate Limit 초과 (429)
- 요청 빈도 조절
- `X-RateLimit-Reset` 헤더 확인

### 4. KIS API 에러
- 모의투자 모드 확인 (`isPaper: true`)
- API 키 유효성 확인
- 계좌번호 형식 확인

## 📈 모니터링

### 로그 확인
- Vercel Dashboard → Functions → Logs
- 요청/응답 로그 (민감 정보 제외)
- 에러 로그 및 스택 트레이스

### 성능 모니터링
- Rate Limit 헤더 확인
- 응답 시간 모니터링
- 에러율 추적

## 🔄 향후 개선사항

1. **Redis 기반 Rate Limiting**: 분산 환경 지원
2. **JWT 토큰 검증**: Firebase 익명 토큰 검증
3. **API 캐싱**: 시장 데이터 캐싱으로 성능 개선
4. **메트릭 수집**: 상세한 사용량 통계
5. **알림 시스템**: 중요 이벤트 알림 