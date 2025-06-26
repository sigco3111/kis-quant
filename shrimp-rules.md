# KIS Quant 개발 표준 문서 (Firebase 기반)

## 프로젝트 개요

- **프로젝트명**: KIS Quant - 한국투자증권 API + Firebase 기반 퀀트 투자 플랫폼
- **목적**: 사용자가 직접 구성한 Firebase DB를 활용해 데이터 소유권을 보장하면서 퀀트 투자를 할 수 있는 웹 플랫폼
- **핵심 가치**: **개인 데이터 소유권 보장** + 코딩 없는 퀀트 투자
- **핵심 기능**: Firebase 설정, API 연동, 전략 생성/관리, 백테스팅, 자동매매, 실시간 모니터링
- **기술 스택**: TypeScript + React/Vue.js + Firebase + Vercel Serverless + 별도 백엔드

## 아키텍처 규칙

### 디렉토리 구조
- **필수 생성할 디렉토리 구조**:
  ```
  kis-quant/
  ├── frontend/              # 프런트엔드 (TypeScript + React/Vue.js)
  │   ├── src/
  │   │   ├── components/    # UI 컴포넌트
  │   │   ├── services/      # Firebase 및 API 서비스
  │   │   ├── utils/         # 암호화 및 유틸리티
  │   │   └── stores/        # 상태 관리 (Zustand/Pinia)
  ├── backend/               # 백엔드 (Vercel Serverless Functions)
  │   ├── api/               # API 프록시 함수들
  │   └── utils/             # 공통 유틸리티
  ├── server/                # 별도 백엔드 서버 (AWS Lambda/EC2)
  │   ├── src/
  │   │   ├── trading/       # 자동매매 로직
  │   │   ├── backtest/      # 백테스팅 엔진
  │   │   └── scheduler/     # 스케줄러
  ├── firebase/              # Firebase 설정 예제
  │   └── security-rules/    # 보안 규칙 템플릿
  ├── docs/                  # 문서
  └── tests/                 # 테스트 코드
  ```

### 데이터 아키텍처
- **사용자 Firebase DB 구조**:
  - **Firestore**: 전략 정보, 백테스트 결과, 매매 로그, 설정 정보, **암호화된 API 키**
  - **Realtime Database**: 실시간 매매 현황, 알림, 상태 업데이트
- **백엔드 서버**: 장기 실행 자동매매 및 복잡한 백테스팅 처리

## 보안 및 인증 관리

### 필수 보안 규칙

#### Firebase DB 암호화 저장
- **절대 금지**: 평문으로 API 키 저장
- **필수**: AES-GCM 암호화 알고리즘 사용
- **구현 방법**:
  ```typescript
  // 올바른 방법 - Firebase DB에 암호화 저장
  import CryptoJS from 'crypto-js';
  
  const encryptApiKey = (apiKey: string, password: string) => {
    return CryptoJS.AES.encrypt(apiKey, password).toString();
  };
  
  const decryptApiKey = (encryptedApiKey: string, password: string) => {
    const bytes = CryptoJS.AES.decrypt(encryptedApiKey, password);
    return bytes.toString(CryptoJS.enc.Utf8);
  };
  ```

#### Firebase 인증 정보 관리
- **사용자가 입력해야 할 Firebase 설정**:
  - `FIREBASE_API_KEY`
  - `FIREBASE_AUTH_DOMAIN`
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_STORAGE_BUCKET`
  - `FIREBASE_MESSAGING_SENDER_ID`
  - `FIREBASE_APP_ID`
- **사용 방법**: Firebase SDK 초기화에만 사용, 별도 저장 불필요

#### 한국투자증권 API 키 관리
- **저장 방법**: 사용자 Firebase DB에 암호화 저장
- **사용 패턴**: 프론트엔드 → 백엔드 (Firebase DB 조회) → KIS API
- **절대 금지**: 프론트엔드에서 직접 KIS API 호출

### 백엔드 프록시 패턴
- **모든 KIS API 호출은 백엔드 프록시를 통해서만 수행**
- **Vercel Serverless Functions**: 단순 데이터 조회, 짧은 처리
- **별도 백엔드 서버**: 자동매매 실행, 장기 백테스팅
- **IP 화이트리스트**: 백엔드 서버 IP만 KIS API 접근 허용

## Firebase 연동 규칙

### Firestore 데이터 구조
- **필수 컬렉션 구조**:
  ```
  users/{userId}/
  ├── strategies/           # 전략 정보
  ├── backtest_results/     # 백테스트 결과
  ├── trades/              # 매매 기록
  ├── settings/            # 사용자 설정
  ├── api_keys/            # 암호화된 API 키
  └── logs/                # 시스템 로그
  ```

### Firebase 보안 규칙
- **필수 구현**: 사용자별 데이터 접근 제한
- **예시 규칙**:
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /users/{userId}/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
  ```

### Firebase 인증 처리
- **익명 인증 사용**: 회원가입 없이 익명 UID 생성
- **세션 관리**: Firebase Auth 상태 유지
- **데이터 연결**: 모든 사용자 데이터는 UID로 구분

## 데이터 처리 규칙

### 금융 데이터 정확성
- **필수**: 모든 금융 계산은 `decimal` 타입 사용
- **JavaScript**: `decimal.js` 라이브러리 사용
- **Python**: `decimal` 모듈 사용
- **금지**: `float` 타입으로 금융 계산

### 실시간 데이터 처리
- **WebSocket 연결**: Firebase Realtime Database 사용
- **상태 동기화**: 매매 상태, 포지션 정보 실시간 업데이트
- **연결 상태 모니터링**: 연결 끊김 시 자동 재연결

## 기능별 구현 규칙

### 초기 설정 페이지
- **필수 구현**: 사용자 첫 접속 시 설정 페이지 우선 표시
- **입력 필드**: Firebase 인증 정보 6개 + KIS API 키 2개
- **유효성 검증**: 입력된 정보로 실제 연결 테스트
- **저장 처리**: Firebase 연결 후 API 키를 암호화하여 Firebase DB에 저장

### 대시보드 구현
- **데이터 소스**: 사용자 Firebase DB에서 직접 조회
- **실시간 업데이트**: Firebase Realtime Database 리스너 사용
- **차트 라이브러리**: Chart.js 또는 D3.js
- **반응형 디자인**: 모바일 지원 필수

### 전략 생성 및 관리
- **저장 위치**: 사용자 Firebase Firestore
- **데이터 형식**: JSON 구조로 전략 파라미터 저장
- **백업 기능**: Firebase 특성상 자동 백업됨
- **버전 관리**: 전략 수정 시 이전 버전 보존

### 백테스팅 엔진
- **실행 환경**: 
  - 단순 백테스트: Vercel Serverless Functions
  - 복잡한 백테스트: 별도 백엔드 서버
- **데이터 조회**: KIS API를 통한 과거 데이터 조회
- **결과 저장**: 사용자 Firebase DB에 저장
- **진행률 표시**: Realtime Database로 실시간 진행률 업데이트

### 자동매매 시스템
- **실행 환경**: 별도 백엔드 서버 (24/7 실행)
- **매매 로직**: 독립적인 모듈로 구현
- **상태 관리**: Firebase Realtime Database
- **로그 기록**: 모든 매매 내역을 Firestore에 저장
- **긴급 정지**: 실시간으로 매매 중단 가능

## 기술 스택 규칙

### 프론트엔드
- **언어**: TypeScript (필수)
- **프레임워크**: React (추천) 또는 Vue.js
- **UI 라이브러리**: Chakra UI, Ant Design, Vuetify
- **상태 관리**: Zustand (React) 또는 Pinia (Vue.js)
- **암호화**: crypto-js 라이브러리

### 백엔드
- **Vercel Serverless**: Python 또는 Node.js
- **별도 서버**: Python (추천) + FastAPI 또는 Node.js + Express
- **데이터 분석**: Pandas, NumPy (Python)
- **스케줄링**: APScheduler (Python) 또는 node-cron (Node.js)

### 데이터베이스
- **Firebase Firestore**: 주요 데이터 저장 (전략, 백테스트 결과, 암호화된 API 키 포함)
- **Firebase Realtime Database**: 실시간 상태 동기화

## 에러 처리 및 로깅

### 에러 처리
- **API 호출**: 모든 API 호출에 try-catch 필수
- **Firebase 연결**: 연결 실패 시 재시도 로직
- **매매 중단**: 치명적 에러 발생 시 자동매매 즉시 중단

### 로깅 규칙
- **로그 저장**: 사용자 Firebase DB의 logs 컬렉션
- **로그 레벨**: ERROR, WARN, INFO, DEBUG
- **민감 정보**: API 키, 인증 정보 로그 기록 금지
- **매매 로그**: 모든 거래 내역은 상세 기록

## 보안 강화 규칙

### 클라이언트 보안
- **XSS 방지**: 모든 사용자 입력 검증 및 이스케이프
- **CSRF 방지**: API 요청에 토큰 검증
- **암호화 키**: 사용자 세션마다 새로운 암호화 키 생성

### 서버 보안
- **CORS 설정**: 허용된 도메인만 접근 가능
- **Rate Limiting**: API 호출 제한
- **입력 검증**: 모든 API 입력 파라미터 검증

### Firebase 보안
- **보안 규칙**: 사용자별 데이터 접근 제한
- **인덱스 최적화**: 필요한 인덱스만 생성
- **백업**: 정기적인 데이터 백업 설정

## 성능 최적화

### 프론트엔드 최적화
- **코드 분할**: 페이지별 번들 분리
- **지연 로딩**: 차트 및 무거운 컴포넌트 지연 로딩
- **캐싱**: Firebase 데이터 로컬 캐싱

### 백엔드 최적화
- **연결 풀링**: Firebase 및 API 연결 재사용
- **배치 처리**: 여러 API 호출을 배치로 처리
- **응답 시간**: API 응답 시간 500ms 이내 목표

## 테스트 규칙

### 단위 테스트
- **커버리지**: 비즈니스 로직 80% 이상
- **금융 로직**: 100% 테스트 커버리지
- **Mock 사용**: Firebase 및 KIS API는 Mock 데이터 사용

### 통합 테스트
- **Firebase 연동**: 실제 테스트 DB 사용
- **API 연동**: Sandbox 환경 사용
- **자동매매**: 모의 투자 모드로 테스트

## 금지 사항

### 절대 금지
- **평문 저장**: API 키를 평문으로 Firebase DB에 저장
- **직접 API 호출**: 프론트엔드에서 KIS API 직접 호출
- **사용자 데이터 접근**: 서비스 운영자가 사용자 Firebase DB 접근
- **공유 데이터베이스**: 여러 사용자가 동일한 Firebase DB 사용
- **하드코딩**: 설정 정보를 코드에 하드코딩

### 구현 금지
- **중앙 집중식 DB**: 모든 데이터는 사용자 개별 Firebase DB에 저장
- **로컬 스토리지**: API 키를 브라우저 로컬 스토리지에 저장
- **회원가입 시스템**: 별도 계정 관리 시스템 구현 금지
- **결제 시스템**: MVP 범위 외

## AI 에이전트 결정 기준

### 우선순위 판단
1. **데이터 소유권 보장** > **보안** > **정확성** > **성능** > **편의성**
2. **사용자 Firebase DB 사용** > **중앙 DB 사용**
3. **암호화 저장** > **평문 저장**

### 기술 선택 기준
- **Firebase 우선**: 데이터 저장은 항상 Firebase 우선
- **검증된 라이브러리**: 암호화 및 보안 관련 검증된 라이브러리 사용
- **TypeScript 필수**: 타입 안정성 보장

### 보안 우선 원칙
- **의심스러운 경우**: 가장 보수적인 보안 방법 선택
- **데이터 접근**: 최소 권한 원칙 적용
- **로그 기록**: 민감 정보 제외하고 상세 기록

## 참고 사항

### 개발 시 반드시 확인할 파일
- **PRD.md**: 제품 요구사항 및 보안 규칙 확인
- **shrimp-rules.md**: 본 문서의 모든 규칙 준수

### Firebase 설정 가이드 제공
- **사용자를 위한 Firebase 프로젝트 생성 가이드 작성 필수**
- **보안 규칙 설정 방법 상세 설명**
- **Firebase SDK 설정 방법 안내**

### 의사결정 우선순위
1. **개인 데이터 소유권 보장**
2. **보안 강화**
3. **사용자 경험**
4. **개발 편의성** 