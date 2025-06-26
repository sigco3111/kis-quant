import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  collection 
} from 'firebase/firestore';
import { FirebaseService } from './FirebaseService';
import { EncryptionUtils } from '../utils/EncryptionUtils';

/**
 * API 키 저장/조회를 위한 인터페이스
 */
export interface ApiKeyData {
  appKey: string;
  appSecret: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 암호화된 API 키 데이터 구조
 */
interface EncryptedApiKeyData {
  encryptedAppKey: string;
  encryptedAppSecret: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * API 키 유효성 검증 결과
 */
export interface ApiKeyValidationResult {
  isValid: boolean;
  message: string;
  accountInfo?: any;
}

/**
 * 한국투자증권 API 키를 암호화하여 Firebase Firestore에 저장/조회하는 서비스 클래스
 */
export class ApiKeyService {
  private static readonly COLLECTION_NAME = 'api_keys';
  private static firebaseService: FirebaseService = new FirebaseService();
  
  /**
   * 현재 사용자의 API 키 문서 참조를 가져옵니다.
   * @returns Firestore 문서 참조
   */
  private static async getUserApiKeyDoc() {
    const user = this.firebaseService.getCurrentUser();
    if (!user) {
      throw new Error('사용자 인증이 필요합니다. Firebase에 먼저 연결해주세요.');
    }

    const db = this.firebaseService.getFirestore();
    if (!db) {
      throw new Error('Firebase Firestore 연결이 필요합니다.');
    }

    return doc(db, this.COLLECTION_NAME, user.uid);
  }

  /**
   * API 키를 암호화하여 Firestore에 저장합니다.
   * @param apiKeyData 저장할 API 키 데이터
   * @returns 저장 성공 여부
   */
  public static async saveApiKeys(apiKeyData: ApiKeyData): Promise<boolean> {
    try {
      const user = this.firebaseService.getCurrentUser();
      if (!user) {
        throw new Error('사용자 인증이 필요합니다.');
      }

      // API 키 형식 검증
      if (!EncryptionUtils.validateApiKeyFormat(apiKeyData.appKey) ||
          !EncryptionUtils.validateApiKeyFormat(apiKeyData.appSecret)) {
        throw new Error('API 키 형식이 올바르지 않습니다. 다시 확인해주세요.');
      }

      // API 키 암호화
      const encryptedAppKey = EncryptionUtils.encryptApiKey(
        apiKeyData.appKey, 
        user.uid
      );
      const encryptedAppSecret = EncryptionUtils.encryptApiKey(
        apiKeyData.appSecret, 
        user.uid
      );

      // 암호화된 데이터 구조 생성
      const encryptedData: EncryptedApiKeyData = {
        encryptedAppKey,
        encryptedAppSecret,
        createdAt: apiKeyData.createdAt || new Date(),
        updatedAt: new Date()
      };

      // Firestore에 저장
      const docRef = await this.getUserApiKeyDoc();
      await setDoc(docRef, encryptedData);

      // 평문 API 키 메모리에서 제거
      EncryptionUtils.clearSensitiveData(apiKeyData.appKey);
      EncryptionUtils.clearSensitiveData(apiKeyData.appSecret);

      console.log('API 키가 성공적으로 저장되었습니다.');
      return true;
    } catch (error) {
      console.error('API 키 저장 중 오류 발생:', error);
      throw new Error('API 키 저장에 실패했습니다. 다시 시도해주세요.');
    }
  }

  /**
   * Firestore에서 암호화된 API 키를 조회하고 복호화합니다.
   * @returns 복호화된 API 키 데이터 또는 null
   */
  public static async getApiKeys(): Promise<ApiKeyData | null> {
    try {
      const user = this.firebaseService.getCurrentUser();
      if (!user) {
        throw new Error('사용자 인증이 필요합니다.');
      }

      const docRef = await this.getUserApiKeyDoc();
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const encryptedData = docSnap.data() as EncryptedApiKeyData;

      // API 키 복호화
      const decryptedAppKey = EncryptionUtils.decryptApiKey(
        encryptedData.encryptedAppKey, 
        user.uid
      );
      const decryptedAppSecret = EncryptionUtils.decryptApiKey(
        encryptedData.encryptedAppSecret, 
        user.uid
      );

      return {
        appKey: decryptedAppKey,
        appSecret: decryptedAppSecret,
        createdAt: encryptedData.createdAt,
        updatedAt: encryptedData.updatedAt
      };
    } catch (error) {
      console.error('API 키 조회 중 오류 발생:', error);
      throw new Error('API 키 조회에 실패했습니다. 키가 손상되었을 수 있습니다.');
    }
  }

  /**
   * 저장된 API 키가 있는지 확인합니다.
   * @returns API 키 존재 여부
   */
  public static async hasApiKeys(): Promise<boolean> {
    try {
      const docRef = await this.getUserApiKeyDoc();
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error('API 키 존재 확인 중 오류 발생:', error);
      return false;
    }
  }

  /**
   * KIS API를 통해 API 키 유효성을 검증합니다.
   * 실제 구현에서는 백엔드 프록시를 통해 검증합니다.
   * @param apiKeyData 검증할 API 키 데이터
   * @returns 검증 결과
   */
  public static async validateApiKeys(apiKeyData: ApiKeyData): Promise<ApiKeyValidationResult> {
    try {
      // TODO: 백엔드 프록시 구현 후 실제 KIS API 호출로 대체
      // 현재는 기본적인 형식 검증만 수행
      const isAppKeyValid = EncryptionUtils.validateApiKeyFormat(apiKeyData.appKey);
      const isAppSecretValid = EncryptionUtils.validateApiKeyFormat(apiKeyData.appSecret);

      if (!isAppKeyValid || !isAppSecretValid) {
        return {
          isValid: false,
          message: 'API 키 형식이 올바르지 않습니다.'
        };
      }

      // 임시 성공 응답 (실제 KIS API 연결 테스트는 백엔드 구현 후 추가)
      return {
        isValid: true,
        message: 'API 키 형식이 유효합니다. 백엔드 연동 후 실제 연결을 테스트합니다.',
        accountInfo: {
          accountStatus: 'pending_verification'
        }
      };
    } catch (error) {
      console.error('API 키 검증 중 오류 발생:', error);
      return {
        isValid: false,
        message: 'API 키 검증 중 오류가 발생했습니다. 다시 시도해주세요.'
      };
    }
  }

  /**
   * 저장된 API 키를 삭제합니다.
   * @returns 삭제 성공 여부
   */
  public static async deleteApiKeys(): Promise<boolean> {
    try {
      const docRef = await this.getUserApiKeyDoc();
      await deleteDoc(docRef);
      console.log('API 키가 성공적으로 삭제되었습니다.');
      return true;
    } catch (error) {
      console.error('API 키 삭제 중 오류 발생:', error);
      throw new Error('API 키 삭제에 실패했습니다. 다시 시도해주세요.');
    }
  }

  /**
   * API 키를 업데이트합니다.
   * @param newApiKeyData 새로운 API 키 데이터
   * @returns 업데이트 성공 여부
   */
  public static async updateApiKeys(newApiKeyData: Omit<ApiKeyData, 'createdAt' | 'updatedAt'>): Promise<boolean> {
    try {
      // 기존 API 키 조회하여 생성일 보존
      const existingData = await this.getApiKeys();
      const createdAt = existingData?.createdAt || new Date();

      const apiKeyData: ApiKeyData = {
        ...newApiKeyData,
        createdAt,
        updatedAt: new Date()
      };

      return await this.saveApiKeys(apiKeyData);
    } catch (error) {
      console.error('API 키 업데이트 중 오류 발생:', error);
      throw new Error('API 키 업데이트에 실패했습니다. 다시 시도해주세요.');
    }
  }
} 