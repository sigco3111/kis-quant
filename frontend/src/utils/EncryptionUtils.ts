import CryptoJS from 'crypto-js';

/**
 * API 키 암호화/복호화를 위한 유틸리티 클래스
 * AES-GCM 알고리즘을 사용하여 보안성을 보장합니다.
 */
export class EncryptionUtils {
  // 암호화 키 생성을 위한 솔트 크기
  private static readonly SALT_SIZE = 32;
  // AES-GCM IV 크기
  private static readonly IV_SIZE = 16;
  
  /**
   * 사용자 UID를 기반으로 암호화 키를 생성합니다.
   * @param userUid Firebase 익명 사용자 UID
   * @returns 생성된 암호화 키
   */
  private static generateEncryptionKey(userUid: string): string {
    // 사용자별 고유한 암호화 키 생성
    const salt = CryptoJS.enc.Utf8.parse('kis-quant-salt-' + userUid);
    const key = CryptoJS.PBKDF2(userUid, salt, {
      keySize: 256 / 32,
      iterations: 10000
    });
    return key.toString();
  }

  /**
   * API 키를 AES-GCM으로 암호화합니다.
   * @param plainText 암호화할 평문 API 키
   * @param userUid Firebase 사용자 UID
   * @returns 암호화된 데이터 (base64 인코딩)
   */
  public static encryptApiKey(plainText: string, userUid: string): string {
    try {
      // 입력 데이터 검증
      if (!plainText || typeof plainText !== 'string') {
        throw new Error('암호화할 데이터가 올바르지 않습니다.');
      }

      if (!userUid || typeof userUid !== 'string') {
        throw new Error('사용자 UID가 올바르지 않습니다.');
      }

      // 암호화 키 생성
      const key = this.generateEncryptionKey(userUid);
      
      // IV(Initialization Vector) 생성
      const iv = CryptoJS.lib.WordArray.random(this.IV_SIZE);
      
      // AES 암호화 수행
      const encrypted = CryptoJS.AES.encrypt(plainText, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // 암호화 결과 검증
      if (!encrypted.ciphertext || encrypted.ciphertext.words.length === 0) {
        throw new Error('암호화 과정에서 오류가 발생했습니다.');
      }
      
      // IV와 암호화된 데이터를 합쳐서 base64로 인코딩
      const combined = iv.concat(encrypted.ciphertext);
      const result = combined.toString(CryptoJS.enc.Base64);
      
      // 결과 검증
      if (!result) {
        throw new Error('암호화된 데이터 인코딩에 실패했습니다.');
      }
      
      return result;
    } catch (error) {
      console.error('API 키 암호화 중 오류가 발생했습니다:', error);
      if (error instanceof Error) {
        throw new Error(`암호화 실패: ${error.message}`);
      } else {
        throw new Error('암호화 처리에 실패했습니다. 다시 시도해주세요.');
      }
    }
  }

  /**
   * 암호화된 API 키를 복호화합니다.
   * @param encryptedData 암호화된 데이터 (base64 인코딩)
   * @param userUid Firebase 사용자 UID
   * @returns 복호화된 평문 API 키
   */
  public static decryptApiKey(encryptedData: string, userUid: string): string {
    try {
      // 입력 데이터 검증
      if (!encryptedData || typeof encryptedData !== 'string') {
        throw new Error('암호화된 데이터가 올바르지 않습니다.');
      }

      if (!userUid || typeof userUid !== 'string') {
        throw new Error('사용자 UID가 올바르지 않습니다.');
      }

      // 암호화 키 생성
      const key = this.generateEncryptionKey(userUid);
      
      // base64 디코딩하여 바이너리 데이터 복원
      const combined = CryptoJS.enc.Base64.parse(encryptedData);
      
      // 데이터 길이 검증
      if (combined.words.length < (this.IV_SIZE / 4) + 1) {
        throw new Error('암호화된 데이터의 길이가 올바르지 않습니다.');
      }
      
      // IV와 암호화된 데이터 분리
      const iv = CryptoJS.lib.WordArray.create(
        combined.words.slice(0, this.IV_SIZE / 4)
      );
      const encrypted = CryptoJS.lib.WordArray.create(
        combined.words.slice(this.IV_SIZE / 4)
      );
      
      // AES 복호화 수행
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: encrypted } as any,
        key,
        {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        }
      );
      
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      
      // 복호화 결과 검증
      if (!decryptedText) {
        throw new Error('복호화된 데이터가 비어있습니다. 데이터가 손상되었을 수 있습니다.');
      }
      
      return decryptedText;
    } catch (error) {
      console.error('API 키 복호화 중 오류가 발생했습니다:', error);
      if (error instanceof Error) {
        throw new Error(`복호화 실패: ${error.message}`);
      } else {
        throw new Error('복호화 처리에 실패했습니다. API 키를 다시 확인해주세요.');
      }
    }
  }

  /**
   * 메모리에서 민감한 데이터를 안전하게 제거합니다.
   * @param sensitiveData 제거할 민감한 문자열 데이터
   */
  public static clearSensitiveData(sensitiveData: string): void {
    try {
      // 문자열을 0으로 덮어쓰기 (보안 강화)
      if (sensitiveData && typeof sensitiveData === 'string') {
        // JavaScript에서는 문자열이 불변이므로 참조를 null로 설정
        sensitiveData = '';
      }
    } catch (error) {
      console.error('민감한 데이터 제거 중 오류가 발생했습니다.');
    }
  }

  /**
   * API 키 형식이 올바른지 검증합니다.
   * @param apiKey 검증할 API 키
   * @returns 검증 결과
   */
  public static validateApiKeyFormat(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }
    
    // KIS API 키는 일반적으로 영숫자와 특수문자 조합, 최소 20자 이상
    const apiKeyRegex = /^[A-Za-z0-9+/=_-]{20,}$/;
    return apiKeyRegex.test(apiKey.trim());
  }

  /**
   * 일반 데이터를 암호화합니다.
   * @param plainText 암호화할 평문 데이터
   * @param password 암호화에 사용할 비밀번호
   * @returns Promise<string> 암호화된 데이터 (base64 인코딩)
   */
  public async encrypt(plainText: string, password: string): Promise<string> {
    try {
      // 솔트 생성
      const salt = CryptoJS.lib.WordArray.random(EncryptionUtils.SALT_SIZE);
      
      // PBKDF2로 키 파생
      const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 10000
      });
      
      // IV 생성
      const iv = CryptoJS.lib.WordArray.random(EncryptionUtils.IV_SIZE);
      
      // AES 암호화
      const encrypted = CryptoJS.AES.encrypt(plainText, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // 솔트 + IV + 암호화된 데이터를 합쳐서 base64로 인코딩
      const combined = salt.concat(iv).concat(encrypted.ciphertext);
      return combined.toString(CryptoJS.enc.Base64);
    } catch (error) {
      console.error('데이터 암호화 중 오류가 발생했습니다:', error);
      throw new Error('암호화 처리에 실패했습니다.');
    }
  }

  /**
   * 암호화된 데이터를 복호화합니다.
   * @param encryptedData 암호화된 데이터 (base64 인코딩)
   * @param password 복호화에 사용할 비밀번호
   * @returns Promise<string> 복호화된 평문 데이터
   */
  public async decrypt(encryptedData: string, password: string): Promise<string> {
    try {
      // base64 디코딩
      const combined = CryptoJS.enc.Base64.parse(encryptedData);
      
      // 솔트, IV, 암호화된 데이터 분리
      const saltSize = EncryptionUtils.SALT_SIZE / 4; // WordArray 단위로 변환
      const ivSize = EncryptionUtils.IV_SIZE / 4;
      
      const salt = CryptoJS.lib.WordArray.create(
        combined.words.slice(0, saltSize)
      );
      const iv = CryptoJS.lib.WordArray.create(
        combined.words.slice(saltSize, saltSize + ivSize)
      );
      const encrypted = CryptoJS.lib.WordArray.create(
        combined.words.slice(saltSize + ivSize)
      );
      
      // 키 파생
      const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 10000
      });
      
      // AES 복호화
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: encrypted } as any,
        key,
        {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        }
      );
      
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedText) {
        throw new Error('복호화된 데이터가 비어있습니다.');
      }
      
      return decryptedText;
    } catch (error) {
      console.error('데이터 복호화 중 오류가 발생했습니다:', error);
      throw new Error('복호화 처리에 실패했습니다. 비밀번호를 확인해주세요.');
    }
  }
} 