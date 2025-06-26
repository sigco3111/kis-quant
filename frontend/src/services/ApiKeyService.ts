/**
 * API 키 관리 서비스 (localStorage 기반)
 * 한국투자증권 API 키를 암호화하여 브라우저에 안전하게 저장
 */

import CryptoJS from 'crypto-js';

export interface ApiKeyData {
  appKey: string;
  appSecret: string;
  accountNumber: string;
  createdAt: number;
  updatedAt: number;
}

interface StoredApiKeyData {
  encryptedData: string;
  salt: string;
  iv: string;
  createdAt: number;
  updatedAt: number;
}

export class ApiKeyService {
  private static readonly STORAGE_KEY = 'kis_quant_api_keys';
  private static readonly SALT_SIZE = 32;
  private static readonly IV_SIZE = 16;

  /**
   * 비밀번호로부터 암호화 키 생성
   */
  private generateKey(password: string, salt: CryptoJS.lib.WordArray): CryptoJS.lib.WordArray {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 10000
    });
  }

  /**
   * API 키 저장 (암호화)
   * @param apiKeyData API 키 데이터
   * @param password 암호화 비밀번호
   */
  async saveApiKeys(apiKeyData: ApiKeyData, password: string): Promise<void> {
    try {
      if (!password || password.trim().length < 4) {
        throw new Error('비밀번호는 최소 4자 이상이어야 합니다.');
      }

      // API 키 데이터 검증
      this.validateApiKeyData(apiKeyData);

      const dataToEncrypt = {
        ...apiKeyData,
        updatedAt: Date.now()
      };

      // 솔트와 IV 생성
      const salt = CryptoJS.lib.WordArray.random(ApiKeyService.SALT_SIZE);
      const iv = CryptoJS.lib.WordArray.random(ApiKeyService.IV_SIZE);
      
      // 키 생성
      const key = this.generateKey(password, salt);
      
      // 데이터 암호화
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(dataToEncrypt), key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const storageData: StoredApiKeyData = {
        encryptedData: encrypted.toString(),
        salt: salt.toString(CryptoJS.enc.Base64),
        iv: iv.toString(CryptoJS.enc.Base64),
        createdAt: apiKeyData.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      // localStorage에 저장
      localStorage.setItem(ApiKeyService.STORAGE_KEY, JSON.stringify(storageData));

      console.log('API 키가 안전하게 저장되었습니다.');
    } catch (error) {
      console.error('API 키 저장 실패:', error);
      throw new Error(`API 키 저장에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * API 키 로드 (복호화)
   * @param password 복호화 비밀번호
   * @returns API 키 데이터 또는 null
   */
  async loadApiKeys(password: string): Promise<ApiKeyData | null> {
    try {
      if (!password || password.trim().length === 0) {
        throw new Error('비밀번호를 입력해주세요.');
      }

      // localStorage에서 데이터 조회
      const storedDataStr = localStorage.getItem(ApiKeyService.STORAGE_KEY);
      if (!storedDataStr) {
        return null;
      }

      const storedData: StoredApiKeyData = JSON.parse(storedDataStr);

      // 솔트와 IV 복원
      const salt = CryptoJS.enc.Base64.parse(storedData.salt);
      const iv = CryptoJS.enc.Base64.parse(storedData.iv);
      
      // 키 생성
      const key = this.generateKey(password, salt);
      
      // 데이터 복호화
      const decrypted = CryptoJS.AES.decrypt(storedData.encryptedData, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const decryptedDataStr = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedDataStr) {
        throw new Error('복호화에 실패했습니다. 비밀번호를 확인해주세요.');
      }

      const apiKeyData: ApiKeyData = JSON.parse(decryptedDataStr);

      // 데이터 검증
      this.validateApiKeyData(apiKeyData);

      console.log('API 키를 성공적으로 로드했습니다.');
      return apiKeyData;

    } catch (error) {
      console.error('API 키 로드 실패:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('복호화') || error.message.includes('decrypt')) {
          throw new Error('비밀번호가 올바르지 않거나 저장된 데이터가 손상되었습니다.');
        }
        throw error;
      }
      
      throw new Error('API 키 로드에 실패했습니다.');
    }
  }

  /**
   * 저장된 API 키 존재 여부 확인
   * @returns 저장된 API 키가 있으면 true
   */
  hasStoredApiKeys(): boolean {
    try {
      const storedData = localStorage.getItem(ApiKeyService.STORAGE_KEY);
      return storedData !== null;
    } catch (error) {
      console.error('저장된 API 키 확인 실패:', error);
      return false;
    }
  }

  /**
   * 저장된 API 키 삭제
   */
  deleteApiKeys(): void {
    try {
      localStorage.removeItem(ApiKeyService.STORAGE_KEY);
      console.log('저장된 API 키가 삭제되었습니다.');
    } catch (error) {
      console.error('API 키 삭제 실패:', error);
      throw new Error('API 키 삭제에 실패했습니다.');
    }
  }

  /**
   * API 키 검증 (한국투자증권 API 형식)
   * @param appKey 앱 키
   * @param appSecret 앱 시크릿
   * @returns 검증 성공 시 true
   */
  async validateApiKey(appKey: string, appSecret: string): Promise<boolean> {
    try {
      // 기본 형식 검증
      if (!appKey || !appSecret) {
        return false;
      }

      // 한국투자증권 API 키 형식 검증 (대략적)
      if (appKey.length < 30 || appSecret.length < 30) {
        return false;
      }

      // TODO: 실제 API 호출로 검증하는 로직 추가 가능
      // 현재는 형식만 검증
      return true;

    } catch (error) {
      console.error('API 키 검증 실패:', error);
      return false;
    }
  }

  /**
   * 저장된 API 키 정보 조회 (메타데이터만)
   * @returns 저장 정보 또는 null
   */
  getStoredApiKeyInfo(): { createdAt: number; updatedAt: number } | null {
    try {
      const storedDataStr = localStorage.getItem(ApiKeyService.STORAGE_KEY);
      if (!storedDataStr) {
        return null;
      }

      const storedData: StoredApiKeyData = JSON.parse(storedDataStr);
      return {
        createdAt: storedData.createdAt,
        updatedAt: storedData.updatedAt
      };
    } catch (error) {
      console.error('저장된 API 키 정보 조회 실패:', error);
      return null;
    }
  }

  /**
   * API 키 데이터 유효성 검증
   * @param apiKeyData 검증할 API 키 데이터
   */
  private validateApiKeyData(apiKeyData: ApiKeyData): void {
    if (!apiKeyData) {
      throw new Error('API 키 데이터가 없습니다.');
    }

    if (!apiKeyData.appKey || apiKeyData.appKey.trim().length === 0) {
      throw new Error('앱 키(App Key)가 필요합니다.');
    }

    if (!apiKeyData.appSecret || apiKeyData.appSecret.trim().length === 0) {
      throw new Error('앱 시크릿(App Secret)이 필요합니다.');
    }

    if (!apiKeyData.accountNumber || apiKeyData.accountNumber.trim().length === 0) {
      throw new Error('계좌번호가 필요합니다.');
    }

    // 계좌번호 형식 검증 (8자리 숫자)
    const accountPattern = /^\d{8}$/;
    if (!accountPattern.test(apiKeyData.accountNumber.replace(/-/g, ''))) {
      throw new Error('계좌번호는 8자리 숫자여야 합니다. (예: 12345678)');
    }
  }
}

// 싱글톤 인스턴스
export const apiKeyService = new ApiKeyService(); 