# KIS Quant 개발 표준 문서 (Firebase 익명 인증 + localStorage 기반)

## 프로젝트 개요

- **프로젝트명**: KIS Quant - 한국투자증권 API + Firebase 기반 퀀트 투자 플랫폼
- **목적**: 브라우저 로컬 저장소 기반으로 완전한 데이터 보안을 보장하면서 퀀트 투자를 할 수 있는 웹 플랫폼
- **핵심 가치**: **완전한 로컬 데이터 보안** + 간편한 설정 + 코딩 없는 퀀트 투자
- **핵심 기능**: Firebase 설정, API 연동, 전략 생성/관리, 백테스팅, 자동매매, 실시간 모니터링
- **기술 스택**: TypeScript + React + Firebase 익명 인증 + localStorage + Vercel Serverless + 별도 백엔드

## 아키텍처 규칙

### 디렉토리 구조
- **필수 생성할 디렉토리 구조**:
  ```
  kis-quant/
  ├── frontend/              # 프런트엔드 (TypeScript + React)
  │   ├── src/
  │   │   ├── components/    # UI 컴포넌트
  │   │   ├── services/      # Firebase 및 API 서비스
  │   │   ├── utils/         # 암호화 및 유틸리티
  │   │   └── stores/        # 상태 관리 (Zustand)
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
- **로컬 저장소 (localStorage)**:
  - **Firebase 설정**: 평문 저장 (공개 정보)
  - **API 키**: AES-256-CBC 암호화 저장
  - **계좌 정보**: 암호화 저장
- **Firebase DB (향후 확장)**:
  - **Firestore**: 전략 정보, 백테스트 결과, 매매 로그 (익명 사용자 기반)
  - **Realtime Database**: 실시간 매매 현황, 알림, 상태 업데이트
- **백엔드 서버**: 장기 실행 자동매매 및 복잡한 백테스팅 처리

## 보안 및 인증 관리

### 필수 보안 규칙

#### localStorage 기반 암호화 저장
- **절대 금지**: 평문으로 API 키 저장
- **필수**: AES-256-CBC 암호화 알고리즘 사용
- **PBKDF2 키 파생**: 비밀번호 기반 강화된 암호화
- **구현 방법**:
  ```typescript
  // 올바른 방법 - localStorage에 암호화 저장
  import CryptoJS from 'crypto-js';
  
  const encryptApiKey = (apiKey: string, password: string) => {
    const salt = CryptoJS.lib.WordArray.random(128/8);
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 10000
    });
    const iv = CryptoJS.lib.WordArray.random(128/8);
    const encrypted = CryptoJS.AES.encrypt(apiKey, key, { iv: iv });
    
    return {
      salt: salt.toString(),
      iv: iv.toString(),
      encrypted: encrypted.toString()
    };
  };
  
  const decryptApiKey = (encryptedData: any, password: string) => {
    const salt = CryptoJS.enc.Hex.parse(encryptedData.salt);
    const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 10000
    });
    
    const decrypted = CryptoJS.AES.decrypt(encryptedData.encrypted, key, { iv: iv });
    return decrypted.toString(CryptoJS.enc.Utf8);
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
  - `FIREBASE_DATABASE_URL` (Realtime Database 사용 시)
- **저장 방법**: localStorage에 평문 저장 (공개 정보)
- **사용 방법**: Firebase SDK 초기화 및 익명 인증

#### 한국투자증권 API 키 관리
- **저장 방법**: localStorage에 AES-256-CBC 암호화 저장
- **사용 패턴**: 로컬 복호화 → 백엔드 전송 → KIS API
- **절대 금지**: 프론트엔드에서 직접 KIS API 호출
- **보안 원칙**: 비밀번호는 서버로 전송하지 않음

### 백엔드 프록시 패턴
- **모든 KIS API 호출은 백엔드 프록시를 통해서만 수행**
- **Vercel Serverless Functions**: 단순 데이터 조회, 짧은 처리
- **별도 백엔드 서버**: 자동매매 실행, 장기 백테스팅
- **IP 화이트리스트**: 백엔드 서버 IP만 KIS API 접근 허용

### Firebase 설정 자동 저장
- **LocalConfigService**: 브라우저 localStorage를 활용한 Firebase 설정 관리
- **자동 로드 순서**: 환경변수 → localStorage → 사용자 입력
- **보안 고려사항**: Firebase 설정은 공개 정보이므로 localStorage 저장 안전
- **사용자 경험**: 한 번 입력하면 다음 접속 시 자동으로 연결

## Firebase 연동 규칙

### 익명 인증 기반 구조
- **인증 방식**: Firebase 익명 인증만 사용
- **사용자 식별**: 익명 UID 기반 (브라우저별 고유)
- **데이터 격리**: 각 익명 사용자별 독립적인 데이터 공간
- **세션 유지**: Firebase Auth 상태 자동 유지

### Firestore 데이터 구조 (향후 확장)
- **필수 컬렉션 구조**:
  ```
  anonymous_users/{anonymousUserId}/
  ├── strategies/           # 전략 정보
  ├── backtest_results/     # 백테스트 결과
  ├── trades/              # 매매 기록
  ├── settings/            # 사용자 설정
  └── logs/                # 시스템 로그
  ```
- **API 키 저장 제외**: API 키는 localStorage에만 저장

### Firebase 보안 규칙
- **필수 구현**: 익명 사용자별 데이터 접근 제한
- **예시 규칙**:
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /anonymous_users/{userId}/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
  ```

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

### 초기 설정 페이지 (간편 설정)
- **설정 프로세스**:
  1. **Firebase 연결**: 설정 입력 → 연결 테스트 → localStorage 자동 저장 → 익명 인증
  2. **API 키 설정**: 한국투자증권 API 키 + 계좌번호 입력 → 비밀번호로 암호화 → localStorage 저장
- **입력 필드**: Firebase 인증 정보 7개 + KIS API 키 2개 + 계좌번호 1개 + 암호화 비밀번호 1개
- **자동 로드**: "환경변수에서 불러오기" 버튼으로 Firebase 설정 자동 입력
- **유효성 검증**: 입력된 정보로 실제 연결 테스트
- **저장 처리**: 
  - Firebase 설정 → localStorage에 평문 저장
  - API 키 → 비밀번호로 암호화하여 localStorage에 저장
- **재접속 편의성**: 저장된 설정으로 원클릭 재연결

### API 키 관리 시스템
- **ApiKeyService 싱글톤 패턴**: 앱 전체에서 하나의 인스턴스 사용
- **암호화 저장**: AES-256-CBC + PBKDF2 키 파생
- **데이터 구조**:
  ```typescript
  interface ApiKeyData {
    appKey: string;
    appSecret: string;
    accountNumber: string;
    createdAt: number;
    updatedAt: number;
  }
  ```
- **CRUD 기능**: 저장, 로드, 수정, 삭제 모든 기능 지원
- **보안 원칙**: 비밀번호 없이는 복호화 불가

### 대시보드 구현
- **데이터 소스**: localStorage에서 API 키 로드 → 백엔드 → KIS API
- **실시간 업데이트**: Firebase Realtime Database 리스너 사용
- **차트 라이브러리**: Chart.js 또는 D3.js
- **반응형 디자인**: 모바일 지원 필수

### 전략 생성 및 관리
- **저장 위치**: Firebase Firestore (익명 사용자별)
- **데이터 형식**: JSON 구조로 전략 파라미터 저장
- **백업 기능**: Firebase 특성상 자동 백업됨
- **버전 관리**: 전략 수정 시 이전 버전 보존

### 백테스팅 엔진
- **실행 환경**: 
  - 단순 백테스트: Vercel Serverless Functions
  - 복잡한 백테스트: 별도 백엔드 서버
- **데이터 조회**: KIS API를 통한 과거 데이터 조회
- **결과 저장**: Firebase DB에 저장 (익명 사용자별)
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
- **프레임워크**: React (필수)
- **UI 라이브러리**: Chakra UI (현재 사용)
- **상태 관리**: Zustand (React)
- **암호화**: crypto-js 라이브러리 (AES-256-CBC + PBKDF2)
- **로컬 저장소**: localStorage (Firebase 설정 + 암호화된 API 키)
- **인증**: Firebase 익명 인증만 사용

### 백엔드
- **Vercel Serverless**: Python 또는 Node.js
- **별도 서버**: Python (추천) + FastAPI 또는 Node.js + Express
- **데이터 분석**: Pandas, NumPy (Python)
- **스케줄링**: APScheduler (Python) 또는 node-cron (Node.js)

### 데이터베이스
- **localStorage**: 주요 설정 및 암호화된 API 키 저장
- **Firebase Firestore**: 전략, 백테스트 결과 저장 (향후 확장)
- **Firebase Realtime Database**: 실시간 상태 동기화 (향후 확장)

## 보안 정책

### 데이터 보호 원칙
- **로컬 우선**: 모든 민감한 데이터는 브라우저에서만 처리
- **암호화 필수**: API 키는 반드시 암호화하여 저장
- **비밀번호 보호**: 암호화 비밀번호는 서버로 전송하지 않음
- **최소 권한**: Firebase 익명 인증으로 최소한의 권한만 부여

### 데이터 손실 위험 관리
- **사용자 교육**: 브라우저 데이터 삭제 시 모든 설정 손실 안내
- **백업 안내**: 중요한 설정은 사용자가 별도 백업 권장
- **복구 불가**: 비밀번호 분실 시 API 키 복구 불가 명시

### 호환성 및 확장성
- **다중 기기 제한**: 각 브라우저별 독립적인 설정
- **향후 확장**: Firebase 기반 클라우드 동기화 기능 추가 가능
- **마이그레이션**: localStorage → Firebase 마이그레이션 도구 제공 예정

## 에러 처리 및 사용자 경험

### 에러 메시지 정책
- **한국어 제공**: 모든 에러 메시지는 한국어로 제공
- **구체적 안내**: 문제 상황과 해결 방법을 구체적으로 안내
- **다음 단계 제시**: 사용자가 취할 수 있는 조치를 명확히 제시

### Firebase 연결 에러 대응
- **`auth/admin-restricted-operation`**: 익명 인증 비활성화 안내
- **네트워크 에러**: 재시도 버튼 및 네트워크 확인 안내
- **설정 오류**: 각 필드별 구체적인 오류 내용 표시

### API 키 관리 에러 대응
- **복호화 실패**: 비밀번호 확인 안내
- **저장 실패**: localStorage 용량 또는 권한 문제 안내
- **형식 오류**: API 키 형식 검증 및 올바른 형식 안내

## 개발 및 배포 규칙

### 코딩 컨벤션
- **TypeScript 엄격 모드**: 모든 타입 명시 필수
- **한국어 주석**: 함수 및 클래스 상단에 목적 설명
- **에러 처리**: 모든 함수에 try-catch 구문 포함
- **로깅**: 중요한 작업은 console.log로 기록

### 테스트 정책
- **단위 테스트**: 각 서비스 클래스별 테스트 코드 작성
- **통합 테스트**: Firebase 연결 및 API 키 관리 플로우 테스트
- **보안 테스트**: 암호화/복호화 기능 검증

### 배포 및 버전 관리
- **Vercel 배포**: 프론트엔드 자동 배포
- **환경변수**: 선택적 사용 (없어도 동작)
- **버전 태깅**: 주요 기능 변경 시 버전 태그 생성
- **문서 업데이트**: 기능 변경 시 README 및 문서 동시 업데이트 