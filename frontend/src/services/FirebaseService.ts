/**
 * Firebase 연동 및 인증 서비스
 * 사용자 Firebase 프로젝트 연결, 익명 인증, 실시간 데이터베이스 관리
 */

import { initializeApp, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { 
  getAuth, 
  Auth, 
  signInAnonymously, 
  onAuthStateChanged, 
  User,
  connectAuthEmulator 
} from 'firebase/auth';
import { 
  getDatabase, 
  Database, 
  ref, 
  set, 
  get, 
  onValue, 
  connectDatabaseEmulator 
} from 'firebase/database';
import { 
  getFirestore, 
  Firestore, 
  connectFirestoreEmulator 
} from 'firebase/firestore';

// Firebase 설정 인터페이스
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// 연결 상태 인터페이스
export interface ConnectionStatus {
  isConnected: boolean;
  isAuthenticated: boolean;
  user: User | null;
  error: string | null;
}

/**
 * Firebase 서비스 클래스
 * 사용자의 Firebase 프로젝트 연결 및 인증 관리
 */
export class FirebaseService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private database: Database | null = null;
  private firestore: Firestore | null = null;
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    isAuthenticated: false,
    user: null,
    error: null
  };
  private statusCallbacks: ((status: ConnectionStatus) => void)[] = [];

  /**
   * Firebase 앱 초기화
   * @param config Firebase 설정 정보
   * @returns Promise<boolean> 초기화 성공 여부
   */
  async initializeFirebase(config: FirebaseConfig): Promise<boolean> {
    try {
      // 기존 앱이 있다면 정리
      this.cleanup();

      // Firebase 설정 유효성 검증
      this.validateConfig(config);

      // Firebase 앱 초기화
      this.app = initializeApp(config);
      this.auth = getAuth(this.app);
      this.database = getDatabase(this.app);
      this.firestore = getFirestore(this.app);

      // Google 인증 서비스에 Auth 인스턴스 설정
      try {
        const { googleAuthService } = await import('./GoogleAuthService');
        const { userConfigService } = await import('./UserConfigService');
        
        googleAuthService.setAuth(this.auth);
        userConfigService.setDatabase(this.database);
        
        console.log('Google 인증 서비스 초기화 완료');
      } catch (error) {
        console.warn('Google 인증 서비스 설정 실패:', error);
      }

      // 기본 초기화 완료 상태로 설정
      this.updateConnectionStatus({
        isConnected: true,
        isAuthenticated: false,
        user: null,
        error: null
      });

      console.log('Firebase 초기화 성공');

      // 연결 테스트 (실패해도 초기화는 성공으로 처리)
      try {
        await this.testConnection();
      } catch (error) {
        console.warn('연결 테스트 실패했지만 초기화는 계속 진행:', error);
        // 연결 테스트 실패는 경고로만 처리하고 초기화는 성공으로 간주
      }

      return true;

    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      console.error('Firebase 초기화 실패:', errorMessage);
      
      this.updateConnectionStatus({
        isConnected: false,
        isAuthenticated: false,
        user: null,
        error: errorMessage
      });

      return false;
    }
  }

  /**
   * 익명 로그인 수행
   * @returns Promise<User | null> 인증된 사용자 정보
   */
  async signInAnonymously(): Promise<User | null> {
    if (!this.auth) {
      throw new Error('Firebase가 초기화되지 않았습니다.');
    }

    try {
      const userCredential = await signInAnonymously(this.auth);
      const user = userCredential.user;

      // 사용자 데이터 공간 초기화
      await this.initializeUserSpace(user.uid);

      this.updateConnectionStatus({
        ...this.connectionStatus,
        isAuthenticated: true,
        user: user,
        error: null
      });

      console.log('익명 인증 성공:', user.uid);
      return user;

    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      console.error('익명 인증 실패:', errorMessage);
      
      this.updateConnectionStatus({
        ...this.connectionStatus,
        isAuthenticated: false,
        user: null,
        error: errorMessage
      });

      throw new Error(errorMessage);
    }
  }

  /**
   * 현재 사용자 정보 반환
   * @returns User | null
   */
  getCurrentUser(): User | null {
    return this.auth?.currentUser || null;
  }

  /**
   * 인증 상태 변화 감지
   * @param callback 상태 변화 콜백 함수
   * @returns 구독 해제 함수
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    if (!this.auth) {
      // Firebase가 초기화되지 않은 경우 빈 함수 반환
      console.warn('Firebase가 초기화되지 않았습니다.');
      return () => {};
    }

    return onAuthStateChanged(this.auth, (user) => {
      this.updateConnectionStatus({
        ...this.connectionStatus,
        isAuthenticated: !!user,
        user: user
      });
      callback(user);
    });
  }

  /**
   * 연결 상태 구독
   * @param callback 상태 변화 콜백 함수
   */
  onConnectionStatusChanged(callback: (status: ConnectionStatus) => void): void {
    this.statusCallbacks.push(callback);
  }

  /**
   * 연결 상태 구독 해제
   * @param callback 해제할 콜백 함수
   */
  offConnectionStatusChanged(callback: (status: ConnectionStatus) => void): void {
    const index = this.statusCallbacks.indexOf(callback);
    if (index > -1) {
      this.statusCallbacks.splice(index, 1);
    }
  }

  /**
   * 현재 연결 상태 반환
   * @returns ConnectionStatus
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Auth 인스턴스 반환
   * @returns Auth | null
   */
  getAuth(): Auth | null {
    return this.auth;
  }

  /**
   * Database 인스턴스 반환
   * @returns Database | null
   */
  getDatabase(): Database | null {
    return this.database;
  }

  /**
   * Firestore 인스턴스 반환
   * @returns Firestore | null
   */
  getFirestore(): Firestore | null {
    return this.firestore;
  }

  /**
   * Firebase 설정 유효성 검증
   * @param config Firebase 설정
   */
  private validateConfig(config: FirebaseConfig): void {
    const requiredFields = [
      'apiKey', 'authDomain', 'databaseURL', 
      'projectId', 'storageBucket', 'messagingSenderId', 'appId'
    ];

    for (const field of requiredFields) {
      if (!config[field as keyof FirebaseConfig]) {
        throw new Error(`${field} 필드가 필요합니다.`);
      }
    }

    // URL 형식 검증 (새로운 Firebase Database URL 형식 지원)
    if (!config.databaseURL.includes('firebaseio.com') && !config.databaseURL.includes('firebasedatabase.app')) {
      throw new Error('올바른 Database URL 형식이 아닙니다.');
    }

    if (!config.authDomain.includes('firebaseapp.com')) {
      throw new Error('올바른 Auth Domain 형식이 아닙니다.');
    }
  }

  /**
   * 연결 테스트 수행
   */
  private async testConnection(): Promise<void> {
    if (!this.database) {
      throw new Error('Database가 초기화되지 않았습니다.');
    }

    try {
      // 간단한 테스트용 경로에 접근 시도
      const testRef = ref(this.database, 'test/connection');
      await get(testRef);
      console.log('Firebase 연결 테스트 성공');
    } catch (error) {
      console.error('Firebase 연결 테스트 상세 오류:', error);
      
      // 특정 에러 코드에 따른 더 구체적인 메시지
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as any).code;
        if (errorCode === 'PERMISSION_DENIED') {
          throw new Error('Firebase 데이터베이스 권한이 없습니다. 보안 규칙을 확인하세요.');
        } else if (errorCode === 'NETWORK_ERROR') {
          throw new Error('네트워크 연결을 확인하세요.');
        }
      }
      
      throw new Error(`Firebase 연결 테스트 실패: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * 사용자 데이터 공간 초기화
   * @param uid 사용자 UID
   */
  private async initializeUserSpace(uid: string): Promise<void> {
    if (!this.database) return;

    try {
      const userRef = ref(this.database, `users/${uid}`);
      const snapshot = await get(userRef);

      // 사용자 데이터가 없으면 초기화
      if (!snapshot.exists()) {
        await set(userRef, {
          createdAt: Date.now(),
          lastLogin: Date.now(),
          profile: {
            isSetup: false
          },
          apiKeys: {},
          strategies: {},
          backtests: {},
          trades: {}
        });
      } else {
        // 마지막 로그인 시간 업데이트
        await set(ref(this.database, `users/${uid}/lastLogin`), Date.now());
      }
    } catch (error) {
      console.warn('사용자 공간 초기화 실패:', error);
    }
  }

  /**
   * 연결 상태 업데이트
   * @param status 새로운 상태
   */
  private updateConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.statusCallbacks.forEach(callback => callback(status));
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

    // Firebase 에러 코드별 한국어 메시지
    const errorMessages: { [key: string]: string } = {
      'auth/invalid-api-key': 'API 키가 올바르지 않습니다.',
      'auth/app-not-authorized': '앱이 인증되지 않았습니다. 프로젝트 설정을 확인하세요.',
      'auth/network-request-failed': '네트워크 연결을 확인하세요.',
      'auth/too-many-requests': '요청이 너무 많습니다. 잠시 후 다시 시도하세요.',
      'auth/admin-restricted-operation': 'Firebase Console에서 인증 방법을 활성화해주세요. (Authentication → Sign-in method → 익명 또는 Google)',
      'auth/operation-not-allowed': '이 인증 방법이 허용되지 않습니다. Firebase Console에서 설정을 확인하세요.',
      'permission-denied': '권한이 거부되었습니다. 보안 규칙을 확인하세요.',
      'unavailable': 'Firebase 서비스를 사용할 수 없습니다.',
      'invalid-argument': '잘못된 인수입니다. 설정을 확인하세요.'
    };

    return errorMessages[errorCode] || errorMessage;
  }

  /**
   * 리소스 정리
   */
  private cleanup(): void {
    this.app = null;
    this.auth = null;
    this.database = null;
    this.firestore = null;
    this.connectionStatus = {
      isConnected: false,
      isAuthenticated: false,
      user: null,
      error: null
    };
  }
}

// 싱글톤 인스턴스
export const firebaseService = new FirebaseService(); 