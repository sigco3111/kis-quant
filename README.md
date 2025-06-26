# KIS Quant - 한국투자증권 API 기반 퀀트 투자 플랫폼

## 📋 프로젝트 개요

KIS Quant는 사용자가 직접 구성한 Firebase DB를 활용하여 **개인 데이터 소유권을 보장**하면서, 한국투자증권 API를 통해 퀀트 투자 전략을 백테스트하고 자동매매를 실행할 수 있는 웹 기반 플랫폼입니다.

### 🎯 핵심 가치
- **개인 데이터 소유권 보장**: 사용자가 직접 Firebase 프로젝트를 구성하고 관리
- **코딩 없는 퀀트 투자**: 직관적인 UI로 투자 전략 생성 및 관리
- **완전한 보안**: 모든 API 키는 암호화되어 사용자 Firebase DB에만 저장

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
- **로컬 저장소**: localStorage (Firebase 설정 자동 저장)
- **인증**: Firebase Google Auth

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
   - **Google** 인증 (프로젝트 지원 이메일 설정 필요)
   - **익명** 인증 (기존 호환성을 위해)
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

### 1. 초기 설정 (2단계 간편 설정)

#### 1단계: Firebase 프로젝트 연결
- Firebase 설정을 한 번만 입력하면 브라우저에 자동 저장
- 환경변수가 없어도 웹 UI에서 직접 설정 가능
- "환경변수에서 불러오기" 버튼으로 자동 설정 가능
- 다음 접속 시 저장된 설정 자동 로드

#### 2단계: Google 로그인 및 API 키 관리
- Firebase 연결 완료 후 Google 계정으로 로그인
- 한국투자증권 API 키 등록 (AES-256 암호화 저장)
- 사용자별 독립적인 데이터 관리
- 클라우드 동기화로 어디서든 접속 가능

#### 🚀 **간편한 재접속**
한 번 설정하면:
1. 앱 접속 → 저장된 Firebase 설정 자동 로드 ✅
2. Google 로그인 → 암호화된 API 키 자동 복원 ✅
3. 바로 거래 시작! 🎯

### 2. 대시보드
- 계좌 현황 실시간 조회
- 실행 중인 전략 모니터링
- 수익률 및 위험 지표 표시

### 3. 전략 생성 및 관리
- 드래그앤드롭 방식의 전략 빌더
- 매수/매도 조건 설정
- 전략 백테스팅

### 4. 백테스팅 엔진
- 과거 데이터 기반 성과 검증
- 다양한 성과 지표 제공
- 결과 시각화

### 5. 자동매매 시스템
- 24/7 실시간 자동매매
- 실시간 제어 및 긴급 정지
- 매매 내역 로깅

### 6. 실시간 모니터링
- WebSocket 기반 실시간 업데이트

## 🆕 최신 업데이트 (v2.0)

### 🚀 사용자 경험 대폭 개선
1. **환경변수 없이도 사용 가능**: 웹 UI에서 직접 Firebase 설정 입력
2. **자동 설정 저장**: 한 번 입력한 설정은 브라우저에 자동 저장
3. **2단계 간편 설정**: Firebase 연결 → Google 로그인 순서로 직관적 진행
4. **원클릭 재연결**: 저장된 설정으로 즉시 Firebase 연결

### 🔧 새로운 기능들
- **LocalConfigService**: 브라우저 localStorage 기반 설정 관리
- **자동 로드**: 앱 시작 시 환경변수 → localStorage 순서로 자동 로드
- **수동 관리**: "저장된 설정 불러오기", "브라우저에 저장" 버튼
- **에러 처리 개선**: Firebase 인증 에러별 상세한 한국어 안내

### 🛡️ 보안 강화
- **AES-256-CBC 암호화**: 모든 민감 데이터 암호화 저장
- **사용자별 데이터 격리**: Google 계정 기반 독립적 데이터 관리
- **로컬 우선 저장**: 브라우저 localStorage 활용으로 프라이버시 보호
- 중요 이벤트 알림
- 상태 동기화

## 🔒 보안 특징

### 데이터 소유권
- 모든 사용자 데이터는 개인 Firebase 프로젝트에 저장
- 개발자는 사용자 데이터에 접근할 수 없음
- 완전한 데이터 통제권 보장

### API 키 보안
- AES-GCM 암호화로 API 키 저장
- 백엔드 프록시를 통한 간접 API 호출
- 프론트엔드에서 직접 KIS API 호출 금지

### Firebase 보안 규칙
- 사용자별 데이터 접근 제한
- 익명 인증 기반 권한 관리
- 실시간 보안 규칙 적용

## 📖 문서

- [설치 가이드](docs/installation.md)
- [API 문서](docs/api.md)
- [보안 가이드](docs/security.md)
- [개발 가이드](docs/development.md)

## 🤝 기여하기

1. Fork 프로젝트
2. Feature 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 Push (`git push origin feature/amazing-feature`)
5. Pull Request 생성

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참고하세요.

## ⚠️ 면책 조항

이 소프트웨어는 교육 및 연구 목적으로 제공됩니다. 실제 투자에 사용할 경우 발생하는 모든 손실에 대해 개발자는 책임지지 않습니다. 투자는 본인의 판단과 책임 하에 진행하시기 바랍니다.

## 📞 지원

- GitHub Issues: 버그 리포트 및 기능 요청
- Discussions: 질문 및 토론
- Email: support@kis-quant.com 