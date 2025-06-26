# KIS Quant - 한국투자증권 API 기반 퀀트 투자 플랫폼

## 📋 프로젝트 개요

KIS Quant는 사용자가 직접 구성한 Firebase DB를 활용하여 **개인 데이터 소유권을 보장**하면서, 한국투자증권 API를 통해 퀀트 투자 전략을 백테스트하고 자동매매를 실행할 수 있는 웹 기반 플랫폼입니다.

### 🎯 핵심 가치
- **완전한 로컬 데이터 보안**: 모든 데이터가 브라우저에 암호화되어 저장
- **코딩 없는 퀀트 투자**: 직관적인 UI로 투자 전략 생성 및 관리
- **간편한 설정**: Firebase 익명 인증으로 복잡한 계정 관리 불필요

## 🏗️ 아키텍처

### 3-Tier 구조
```
프론트엔드 (TypeScript + React + Firebase)
    ↓
미들웨어 (Vercel Serverless Functions)
    ↓
백엔드 (Python + FastAPI + 별도 서버)
```

### 디렉토리 구조
```
kis-quant/
├── frontend/              # 프론트엔드 (TypeScript + React)
│   ├── src/
│   │   ├── components/    # UI 컴포넌트
│   │   ├── services/      # Firebase 및 API 서비스
│   │   ├── utils/         # 암호화 및 유틸리티
│   │   └── stores/        # 상태 관리 (Zustand)
├── backend/               # 백엔드 (Vercel Serverless Functions)
│   ├── api/               # API 프록시 함수들
│   └── utils/             # 공통 유틸리티
├── server/                # 별도 백엔드 서버 (Python + FastAPI)
│   ├── src/
│   │   ├── trading/       # 자동매매 로직
│   │   ├── backtest/      # 백테스팅 엔진
│   │   └── scheduler/     # 스케줄러
├── firebase/              # Firebase 설정 예제
├── docs/                  # 문서
└── tests/                 # 테스트 코드
```

## 🔧 기술 스택

### 프론트엔드
- **언어**: TypeScript
- **프레임워크**: React
- **UI 라이브러리**: Chakra UI
- **상태 관리**: Zustand
- **암호화**: crypto-js (AES-256-CBC)
- **데이터베이스**: Firebase Firestore + Realtime Database
- **로컬 저장소**: localStorage (Firebase 설정 + API 키 암호화 저장)
- **인증**: Firebase 익명 인증

### 백엔드
- **미들웨어**: Vercel Serverless Functions
- **서버**: Python + FastAPI
- **데이터 분석**: Pandas, NumPy
- **스케줄링**: APScheduler
- **인증**: Firebase Admin SDK

## 🚀 설치 및 실행

### 사전 요구사항
- Node.js 18+
- Python 3.9+
- Firebase 프로젝트
- 한국투자증권 API 키

### 1. 프로젝트 클론 및 의존성 설치

```bash
# 프로젝트 클론
git clone <repository-url>
cd kis-quant

# 프론트엔드 의존성 설치
cd frontend
npm install

# 백엔드 의존성 설치
cd ../server
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 환경 변수 설정

#### 2.1 Firebase 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. **Authentication** → **Sign-in method**에서 다음을 활성화:
   - **익명** 인증 ⭐ (필수)
3. **Firestore Database** 생성 (테스트 모드)
4. **Realtime Database** 생성 (테스트 모드)
5. **프로젝트 설정** → **일반** → **웹 앱 추가**

#### 2.2 환경 변수 파일 생성

```bash
# 루트 디렉토리에서
cp env.example .env

# React 앱용 환경 변수 (frontend 폴더에)
cd frontend
cp ../env.example .env
```

#### 2.3 환경 변수 설정 (선택사항)

환경변수를 설정하면 앱 시작 시 자동으로 Firebase 설정이 로드됩니다:

**frontend/.env** 파일을 편집하여 Firebase 설정 입력:
```bash
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com/
REACT_APP_FIREBASE_PROJECT_ID=your_project_id_here
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
REACT_APP_FIREBASE_APP_ID=your_app_id_here
```

> 💡 **환경변수 없이도 사용 가능!**: 웹 앱에서 직접 Firebase 설정을 입력할 수 있습니다. 한 번 입력하면 브라우저에 저장되어 다음부터 자동으로 로드됩니다.

### 3. 개발 서버 실행

```bash
# 프론트엔드 실행
cd frontend
npm start

# 백엔드 서버 실행 (새 터미널)
cd server
source venv/bin/activate
uvicorn src.main:app --reload --port 8000
```

## 🚀 Vercel 배포

### 1. Vercel 프로젝트 생성
1. [Vercel Dashboard](https://vercel.com/dashboard)에서 **New Project** 클릭
2. GitHub 저장소 연결
3. **Framework Preset**: Create React App 선택
4. **Root Directory**: 기본값 사용 (루트)
5. **Build and Output Settings**: 자동 감지됨

### 2. 환경변수 설정
Vercel Dashboard → **Project Settings** → **Environment Variables**에서 다음 변수들 추가:

```bash
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com/
REACT_APP_FIREBASE_PROJECT_ID=your_project_id_here
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
REACT_APP_FIREBASE_APP_ID=your_app_id_here
NODE_ENV=production
GENERATE_SOURCEMAP=false
```

### 3. Firebase 도메인 설정
Firebase Console → **Authentication** → **Sign-in method** → **승인된 도메인**에 Vercel 도메인 추가:
- `your-project.vercel.app`
- `kis-quant.vercel.app` (커스텀 도메인 사용 시)

### 4. 배포
- GitHub에 푸시하면 자동으로 Vercel에서 배포됨
- 수동 배포: Vercel Dashboard에서 **Deploy** 버튼 클릭

## 📚 주요 기능

### 1. 초기 설정 (간편 설정)

#### Firebase 프로젝트 연결
- Firebase 설정을 한 번만 입력하면 브라우저에 자동 저장
- 환경변수가 없어도 웹 UI에서 직접 설정 가능
- "환경변수에서 불러오기" 버튼으로 자동 설정 가능
- 다음 접속 시 저장된 설정 자동 로드 및 익명 인증

#### API 키 관리
- 한국투자증권 API 키를 AES-256-CBC 암호화로 브라우저에 안전하게 저장
- 사용자 지정 비밀번호로 암호화/복호화
- 계좌번호 포함 완전한 거래 정보 관리
- 브라우저별 독립적인 데이터 저장

#### 🚀 **간편한 재접속**
한 번 설정하면:
1. 앱 접속 → 저장된 Firebase 설정 자동 로드 ✅
2. 익명 인증 자동 완료 ✅
3. API 키 비밀번호 입력 → 거래 정보 복원 ✅
4. 바로 거래 시작! 🎯

### 2. 보안 시스템
- **완전한 로컬 저장**: 모든 민감한 데이터가 브라우저에만 저장
- **AES-256-CBC 암호화**: 산업 표준 암호화로 API 키 보호
- **비밀번호 기반 보안**: 사용자만 아는 비밀번호로 데이터 접근
- **서버 전송 없음**: 비밀번호와 API 키가 서버로 전송되지 않음

### 3. 대시보드 (향후 구현)
- 계좌 현황 실시간 조회
- 실행 중인 전략 모니터링
- 수익률 및 위험 지표 표시
- 실시간 주식 데이터 조회 및 분석
- 백테스팅 및 전략 검증
- 자동매매 시스템
- 포트폴리오 관리 및 리스크 분석
- 실시간 알림 및 리포트

## 🔒 보안 및 데이터 정책

### 데이터 저장 위치
- **Firebase 설정**: 브라우저 localStorage (평문)
- **API 키**: 브라우저 localStorage (AES-256-CBC 암호화)
- **거래 데이터**: 향후 Firebase Firestore (익명 사용자 기반)

### 보안 특징
- ✅ 모든 민감한 데이터가 로컬에서만 처리
- ✅ API 키는 사용자 비밀번호로 암호화
- ✅ 서버에는 암호화된 데이터만 전송 (향후)
- ✅ Firebase 익명 인증으로 개인정보 수집 최소화

### 주의사항
- ⚠️ 브라우저 데이터 삭제 시 모든 설정 손실
- ⚠️ 비밀번호 분실 시 API 키 복구 불가
- ⚠️ 다른 기기에서 사용하려면 재설정 필요

## 🛠️ 개발 가이드

### 프로젝트 구조
```
frontend/src/
├── components/
│   ├── FirebaseSetup.tsx    # Firebase 설정 UI
│   ├── ApiKeySetup.tsx      # API 키 관리 UI
│   └── GoogleLogin.tsx      # (사용 안함)
├── services/
│   ├── FirebaseService.ts   # Firebase 연동
│   ├── ApiKeyService.ts     # API 키 관리 (localStorage)
│   └── LocalConfigService.ts # 로컬 설정 관리
└── utils/
    └── EncryptionUtils.ts   # 암호화 유틸리티
```

### 주요 서비스

#### FirebaseService
- Firebase 앱 초기화 및 익명 인증
- Firestore, Realtime Database 연결
- 연결 상태 관리

#### ApiKeyService
- API 키 암호화/복호화 (AES-256-CBC)
- localStorage 기반 저장/로드
- 계좌 정보 관리

#### LocalConfigService
- Firebase 설정 localStorage 저장/로드
- 환경변수 자동 로드
- 설정 유효성 검증

## 🤝 기여 가이드

### 개발 환경 설정
1. 프로젝트 포크 및 클론
2. 개발 브랜치 생성
3. 변경사항 커밋 및 푸시
4. Pull Request 생성

### 코딩 컨벤션
- TypeScript 엄격 모드 사용
- 함수/클래스 상단에 한국어 주석 필수
- 에러 처리 및 로깅 포함
- 컴포넌트별 단일 책임 원칙

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 지원

문제가 발생하거나 질문이 있으시면 GitHub Issues를 통해 문의해주세요.

---

**⚠️ 투자 위험 고지**: 이 소프트웨어는 교육 및 연구 목적으로 제공됩니다. 실제 투자에 사용할 때는 충분한 검토와 위험 관리가 필요하며, 투자 손실에 대한 책임은 사용자에게 있습니다. 