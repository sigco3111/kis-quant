/**
 * Google OAuth 인증 서비스
 * Firebase Google 인증을 통한 사용자 로그인/로그아웃 관리
 */

import { 
  Auth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User,
  getAuth
} from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';

// Google 사용자 정보 인터페이스
export interface GoogleUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  emailVerified: boolean;
}

// 인증 상태 인터페이스
export interface AuthState {
  isAuthenticated: boolean;
  user: GoogleUser | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Google 인증 서비스 클래스
 */
export class GoogleAuthService {
  private auth: Auth | null = null;
  private provider: GoogleAuthProvider;
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null
  };
  private stateCallbacks: ((state: AuthState) => void)[] = [];

  constructor() {
    // Google 인증 프로바이더 설정
    this.provider = new GoogleAuthProvider();
    this.provider.addScope('email');
    this.provider.addScope('profile');
  }

  /**
   * Firebase Auth 인스턴스 설정
   * @param auth Firebase Auth 인스턴스
   */
  setAuth(auth: Auth): void {
    this.auth = auth;
    this.setupAuthStateListener();
  }

  /**
   * 기본 Firebase 앱으로 초기화 (Google 로그인용)
   */
  private async initializeDefaultFirebase(): Promise<void> {
    try {
      // 기존 앱이 있는지 확인
      const existingApps = getApps();
      let app;
      
      if (existingApps.length === 0) {
        // 환경변수에서 Firebase 설정 읽기 (선택적)
        const envConfig = {
          apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
          authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
          databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
          projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
          storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.REACT_APP_FIREBASE_APP_ID
        };

        // 환경변수가 있으면 사용, 없으면 에러 발생
        if (envConfig.apiKey && envConfig.authDomain && envConfig.projectId) {
          console.log('환경변수에서 Firebase 설정 로드');
          
          console.log('Firebase 기본 앱 초기화 중...', {
            projectId: envConfig.projectId,
            authDomain: envConfig.authDomain
          });

          // Firebase 앱 초기화 (기본 앱으로)
          app = initializeApp(envConfig);
          this.auth = getAuth(app);
        } else {
          console.warn('Firebase 환경변수가 설정되지 않음');
          throw new Error('Google 로그인을 위해서는 먼저 Firebase 프로젝트 설정을 입력해주세요.');
        }
      } else {
        // 기존 앱 사용
        app = existingApps[0];
        this.auth = getAuth(app);
        console.log('기존 Firebase 앱 사용:', app.name);
      }

      // Google Auth Provider 설정
      this.provider.setCustomParameters({
        prompt: 'select_account'
      });

      this.setupAuthStateListener();
      console.log('Firebase Auth 초기화 완료');
    } catch (error) {
      console.error('기본 Firebase 초기화 실패:', error);
      throw new Error(`Firebase 초기화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * Google 로그인
   * @returns Promise<GoogleUser | null>
   */
  async signInWithGoogle(): Promise<GoogleUser | null> {
    // Firebase Auth가 없으면 기본 Firebase 앱으로 초기화 시도
    if (!this.auth) {
      try {
        await this.initializeDefaultFirebase();
      } catch (error) {
        throw new Error('Google 로그인을 위한 Firebase 초기화에 실패했습니다.');
      }
    }

    // Auth 인스턴스 확인
    if (!this.auth) {
      throw new Error('Firebase Auth 초기화에 실패했습니다.');
    }

    this.updateAuthState({
      ...this.authState,
      isLoading: true,
      error: null
    });

    try {
      const result = await signInWithPopup(this.auth, this.provider);
      const user = result.user;

      const googleUser: GoogleUser = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        emailVerified: user.emailVerified
      };

      this.updateAuthState({
        isAuthenticated: true,
        user: googleUser,
        isLoading: false,
        error: null
      });

      console.log('Google 로그인 성공:', googleUser.email);
      return googleUser;

    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      console.error('Google 로그인 실패:', errorMessage);
      
      this.updateAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: errorMessage
      });

      throw new Error(errorMessage);
    }
  }

  /**
   * 로그아웃
   */
  async signOut(): Promise<void> {
    if (!this.auth) {
      throw new Error('Firebase Auth가 초기화되지 않았습니다.');
    }

    try {
      await signOut(this.auth);
      
      this.updateAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null
      });

      console.log('로그아웃 완료');
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      console.error('로그아웃 실패:', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * 현재 사용자 정보 반환
   * @returns GoogleUser | null
   */
  getCurrentUser(): GoogleUser | null {
    return this.authState.user;
  }

  /**
   * 현재 인증 상태 반환
   * @returns AuthState
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * 인증 상태 변화 구독
   * @param callback 상태 변화 콜백 함수
   */
  onAuthStateChanged(callback: (state: AuthState) => void): void {
    this.stateCallbacks.push(callback);
  }

  /**
   * 인증 상태 구독 해제
   * @param callback 해제할 콜백 함수
   */
  offAuthStateChanged(callback: (state: AuthState) => void): void {
    const index = this.stateCallbacks.indexOf(callback);
    if (index > -1) {
      this.stateCallbacks.splice(index, 1);
    }
  }

  /**
   * Firebase 인증 상태 리스너 설정
   */
  private setupAuthStateListener(): void {
    if (!this.auth) return;

    onAuthStateChanged(this.auth, (user) => {
      if (user && user.providerData.some(provider => provider.providerId === 'google.com')) {
        // Google 로그인 사용자
        const googleUser: GoogleUser = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          emailVerified: user.emailVerified
        };

        this.updateAuthState({
          isAuthenticated: true,
          user: googleUser,
          isLoading: false,
          error: null
        });
      } else {
        // 로그아웃 상태
        this.updateAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        });
      }
    });
  }

  /**
   * 인증 상태 업데이트
   * @param state 새로운 상태
   */
  private updateAuthState(state: AuthState): void {
    this.authState = state;
    this.stateCallbacks.forEach(callback => callback(state));
  }

  /**
   * 에러 메시지 추출
   * @param error 에러 객체
   * @returns 사용자 친화적 에러 메시지
   */
  private getErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    
    const errorCode = error?.code || '';
    const errorMessage = error?.message || '알 수 없는 오류가 발생했습니다.';

    // Google 인증 에러 코드별 한국어 메시지
    const errorMessages: { [key: string]: string } = {
      'auth/popup-closed-by-user': '로그인 창이 닫혔습니다. 다시 시도해주세요.',
      'auth/popup-blocked': '팝업이 차단되었습니다. 팝업을 허용하고 다시 시도해주세요.',
      'auth/cancelled-popup-request': '로그인이 취소되었습니다.',
      'auth/network-request-failed': '네트워크 연결을 확인하세요.',
      'auth/too-many-requests': '요청이 너무 많습니다. 잠시 후 다시 시도하세요.',
      'auth/user-disabled': '계정이 비활성화되었습니다.',
      'auth/operation-not-allowed': 'Google 로그인이 활성화되지 않았습니다.',
      'auth/admin-restricted-operation': '🚨 Firebase Console에서 Google 로그인을 활성화해주세요!\n\n1. Firebase Console → Authentication → Sign-in method\n2. Google 제공업체 활성화\n3. 승인된 도메인에 localhost 추가',
      'auth/unauthorized-domain': '허용되지 않은 도메인입니다. Firebase Console에서 도메인을 추가해주세요.',
      'auth/configuration-not-found': 'Firebase 설정이 올바르지 않습니다. 프로젝트 설정을 확인해주세요.',
      'auth/invalid-api-key': 'Firebase API 키가 올바르지 않습니다.',
      'auth/project-not-found': 'Firebase 프로젝트를 찾을 수 없습니다.'
    };

    const friendlyMessage = errorMessages[errorCode];
    if (friendlyMessage) {
      console.error(`Firebase Auth Error [${errorCode}]:`, errorMessage);
      return friendlyMessage;
    }

    return `인증 오류: ${errorMessage}`;
  }
}

// 싱글톤 인스턴스
export const googleAuthService = new GoogleAuthService(); 