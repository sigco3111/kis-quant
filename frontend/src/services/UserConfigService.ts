/**
 * 사용자 설정 저장 서비스
 * 사용자별 Firebase 설정을 암호화하여 저장/로드
 */

import { Database, ref, set, get } from 'firebase/database';
import { FirebaseConfig } from './FirebaseService';
import { EncryptionUtils } from '../utils/EncryptionUtils';

// 저장된 사용자 설정 인터페이스
export interface UserConfig {
  firebaseConfig: FirebaseConfig;
  savedAt: number;
  lastUsed: number;
}

// 암호화된 설정 인터페이스
interface EncryptedUserConfig {
  encryptedData: string;
  savedAt: number;
  lastUsed: number;
}

/**
 * 사용자 설정 서비스 클래스
 */
export class UserConfigService {
  private database: Database | null = null;
  private encryptionUtils: EncryptionUtils;

  constructor() {
    this.encryptionUtils = new EncryptionUtils();
  }

  /**
   * Firebase Database 인스턴스 설정
   * @param database Firebase Database 인스턴스
   */
  setDatabase(database: Database): void {
    this.database = database;
  }

  /**
   * 사용자 Firebase 설정 저장
   * @param userId 사용자 UID
   * @param firebaseConfig Firebase 설정
   * @param userPassword 사용자 비밀번호 (암호화 키 생성용)
   * @returns Promise<boolean>
   */
  async saveUserFirebaseConfig(
    userId: string,
    firebaseConfig: FirebaseConfig,
    userPassword: string
  ): Promise<boolean> {
    if (!this.database) {
      throw new Error('Database가 초기화되지 않았습니다.');
    }

    try {
      // 사용자 설정 객체 생성
      const userConfig: UserConfig = {
        firebaseConfig,
        savedAt: Date.now(),
        lastUsed: Date.now()
      };

      // 설정 데이터 암호화
      const encryptedData = await this.encryptionUtils.encrypt(
        JSON.stringify(userConfig),
        userPassword
      );

      // 암호화된 설정 저장
      const encryptedConfig: EncryptedUserConfig = {
        encryptedData,
        savedAt: userConfig.savedAt,
        lastUsed: userConfig.lastUsed
      };

      // Firebase Database에 저장
      const configRef = ref(this.database, `users/${userId}/firebaseConfig`);
      await set(configRef, encryptedConfig);

      console.log('사용자 Firebase 설정 저장 완료');
      return true;

    } catch (error) {
      console.error('Firebase 설정 저장 실패:', error);
      throw new Error('설정 저장에 실패했습니다.');
    }
  }

  /**
   * 사용자 Firebase 설정 로드
   * @param userId 사용자 UID
   * @param userPassword 사용자 비밀번호 (복호화 키 생성용)
   * @returns Promise<UserConfig | null>
   */
  async loadUserFirebaseConfig(
    userId: string,
    userPassword: string
  ): Promise<UserConfig | null> {
    if (!this.database) {
      throw new Error('Database가 초기화되지 않았습니다.');
    }

    try {
      // Firebase Database에서 암호화된 설정 로드
      const configRef = ref(this.database, `users/${userId}/firebaseConfig`);
      const snapshot = await get(configRef);

      if (!snapshot.exists()) {
        console.log('저장된 Firebase 설정이 없습니다.');
        return null;
      }

      const encryptedConfig: EncryptedUserConfig = snapshot.val();

      // 데이터 복호화
      const decryptedData = await this.encryptionUtils.decrypt(
        encryptedConfig.encryptedData,
        userPassword
      );

      const userConfig: UserConfig = JSON.parse(decryptedData);

      // 마지막 사용 시간 업데이트
      await this.updateLastUsed(userId, userPassword);

      console.log('사용자 Firebase 설정 로드 완료');
      return userConfig;

    } catch (error) {
      console.error('Firebase 설정 로드 실패:', error);
      
      // 복호화 실패인 경우 구체적인 에러 메시지
      if (error instanceof Error && error.message.includes('decrypt')) {
        throw new Error('저장된 설정을 복호화할 수 없습니다. 비밀번호를 확인하세요.');
      }
      
      throw new Error('설정 로드에 실패했습니다.');
    }
  }

  /**
   * 저장된 설정이 있는지 확인
   * @param userId 사용자 UID
   * @returns Promise<boolean>
   */
  async hasUserFirebaseConfig(userId: string): Promise<boolean> {
    if (!this.database) {
      return false;
    }

    try {
      const configRef = ref(this.database, `users/${userId}/firebaseConfig`);
      const snapshot = await get(configRef);
      return snapshot.exists();
    } catch (error) {
      console.error('설정 존재 여부 확인 실패:', error);
      return false;
    }
  }

  /**
   * 사용자 Firebase 설정 삭제
   * @param userId 사용자 UID
   * @returns Promise<boolean>
   */
  async deleteUserFirebaseConfig(userId: string): Promise<boolean> {
    if (!this.database) {
      throw new Error('Database가 초기화되지 않았습니다.');
    }

    try {
      const configRef = ref(this.database, `users/${userId}/firebaseConfig`);
      await set(configRef, null);
      
      console.log('사용자 Firebase 설정 삭제 완료');
      return true;
    } catch (error) {
      console.error('Firebase 설정 삭제 실패:', error);
      throw new Error('설정 삭제에 실패했습니다.');
    }
  }

  /**
   * 마지막 사용 시간 업데이트
   * @param userId 사용자 UID
   * @param userPassword 사용자 비밀번호
   */
  private async updateLastUsed(userId: string, userPassword: string): Promise<void> {
    try {
      const configRef = ref(this.database!, `users/${userId}/firebaseConfig/lastUsed`);
      await set(configRef, Date.now());
    } catch (error) {
      console.warn('마지막 사용 시간 업데이트 실패:', error);
      // 이 오류는 중요하지 않으므로 무시
    }
  }

  /**
   * 사용자 프로필 정보 저장
   * @param userId 사용자 UID
   * @param profile 사용자 프로필
   */
  async saveUserProfile(userId: string, profile: {
    email: string;
    displayName: string;
    photoURL: string;
    lastLogin: number;
  }): Promise<void> {
    if (!this.database) {
      throw new Error('Database가 초기화되지 않았습니다.');
    }

    try {
      const profileRef = ref(this.database, `users/${userId}/profile`);
      await set(profileRef, profile);
    } catch (error) {
      console.error('사용자 프로필 저장 실패:', error);
      // 프로필 저장 실패는 중요하지 않으므로 에러를 던지지 않음
    }
  }

  /**
   * 설정 메타데이터 조회
   * @param userId 사용자 UID
   * @returns Promise<{savedAt: number, lastUsed: number} | null>
   */
  async getConfigMetadata(userId: string): Promise<{savedAt: number, lastUsed: number} | null> {
    if (!this.database) {
      return null;
    }

    try {
      const configRef = ref(this.database, `users/${userId}/firebaseConfig`);
      const snapshot = await get(configRef);

      if (!snapshot.exists()) {
        return null;
      }

      const data = snapshot.val();
      return {
        savedAt: data.savedAt || 0,
        lastUsed: data.lastUsed || 0
      };
    } catch (error) {
      console.error('설정 메타데이터 조회 실패:', error);
      return null;
    }
  }
}

// 싱글톤 인스턴스
export const userConfigService = new UserConfigService(); 