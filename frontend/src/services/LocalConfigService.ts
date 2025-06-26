/**
 * 로컬 Firebase 설정 관리 서비스
 * 브라우저 localStorage에 Firebase 설정을 저장하여 재사용
 */

export interface LocalFirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

class LocalConfigService {
  private readonly CONFIG_KEY = 'kis-quant-firebase-config';

  /**
   * Firebase 설정을 localStorage에 저장
   */
  saveFirebaseConfig(config: LocalFirebaseConfig): void {
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
      console.log('Firebase 설정이 브라우저에 저장되었습니다.');
    } catch (error) {
      console.error('Firebase 설정 저장 실패:', error);
      throw new Error('설정 저장에 실패했습니다.');
    }
  }

  /**
   * localStorage에서 Firebase 설정 불러오기
   */
  loadFirebaseConfig(): LocalFirebaseConfig | null {
    try {
      const saved = localStorage.getItem(this.CONFIG_KEY);
      if (saved) {
        const config = JSON.parse(saved) as LocalFirebaseConfig;
        console.log('저장된 Firebase 설정을 불러왔습니다.');
        return config;
      }
      return null;
    } catch (error) {
      console.error('Firebase 설정 불러오기 실패:', error);
      return null;
    }
  }

  /**
   * 저장된 Firebase 설정이 있는지 확인
   */
  hasStoredConfig(): boolean {
    return localStorage.getItem(this.CONFIG_KEY) !== null;
  }

  /**
   * 저장된 Firebase 설정 삭제
   */
  clearFirebaseConfig(): void {
    try {
      localStorage.removeItem(this.CONFIG_KEY);
      console.log('저장된 Firebase 설정이 삭제되었습니다.');
    } catch (error) {
      console.error('Firebase 설정 삭제 실패:', error);
    }
  }

  /**
   * 설정 유효성 검증
   */
  validateConfig(config: LocalFirebaseConfig): boolean {
    const requiredFields = ['apiKey', 'authDomain', 'projectId'];
    return requiredFields.every(field => 
      config[field as keyof LocalFirebaseConfig]?.trim()
    );
  }
}

export const localConfigService = new LocalConfigService(); 