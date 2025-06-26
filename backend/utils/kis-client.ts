import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import CryptoJS from 'crypto-js';

/**
 * 한국투자증권 API 클라이언트
 * API 키 복호화, 토큰 관리, API 호출을 담당
 */

// KIS API 기본 설정
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const KIS_PAPER_BASE_URL = 'https://openapivts.koreainvestment.com:29443'; // 모의투자

interface KisApiConfig {
  appKey: string;
  appSecret: string;
  accountNumber: string;
  isPaper?: boolean; // 모의투자 여부
}

interface KisTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * 암호화된 API 키 복호화
 * @param encryptedData - 암호화된 데이터
 * @param password - 복호화 비밀번호
 * @returns 복호화된 문자열
 */
function decryptApiKey(encryptedData: any, password: string): string {
  try {
    const salt = CryptoJS.enc.Hex.parse(encryptedData.salt);
    const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 10000
    });
    
    const decrypted = CryptoJS.AES.decrypt(encryptedData.encrypted, key, { iv: iv });
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!result) {
      throw new Error('복호화에 실패했습니다. 비밀번호를 확인해주세요.');
    }
    
    return result;
  } catch (error) {
    console.error('API key decryption failed:', error);
    throw new Error('API 키 복호화에 실패했습니다.');
  }
}

/**
 * KIS API 클라이언트 클래스
 */
export class KisApiClient {
  private client: AxiosInstance;
  private config: KisApiConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: KisApiConfig) {
    this.config = config;
    const baseURL = config.isPaper ? KIS_PAPER_BASE_URL : KIS_BASE_URL;
    
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });

    // 요청 인터셉터 - 토큰 자동 추가
    this.client.interceptors.request.use(async (config) => {
      await this.ensureValidToken();
      if (this.accessToken) {
        config.headers['authorization'] = `Bearer ${this.accessToken}`;
      }
      return config;
    });
  }

  /**
   * 암호화된 API 키로 클라이언트 생성
   * @param encryptedApiKey - 암호화된 앱 키
   * @param encryptedSecret - 암호화된 앱 시크릿
   * @param accountNumber - 계좌번호
   * @param password - 복호화 비밀번호
   * @param isPaper - 모의투자 여부
   * @returns KisApiClient 인스턴스
   */
  static createFromEncrypted(
    encryptedApiKey: any,
    encryptedSecret: any,
    accountNumber: string,
    password: string,
    isPaper: boolean = false
  ): KisApiClient {
    const appKey = decryptApiKey(encryptedApiKey, password);
    const appSecret = decryptApiKey(encryptedSecret, password);
    
    return new KisApiClient({
      appKey,
      appSecret,
      accountNumber,
      isPaper
    });
  }

  /**
   * 유효한 토큰 확보
   */
  private async ensureValidToken(): Promise<void> {
    const now = Date.now();
    
    // 토큰이 만료되었거나 없으면 새로 발급
    if (!this.accessToken || now >= this.tokenExpiresAt) {
      await this.getAccessToken();
    }
  }

  /**
   * 액세스 토큰 발급
   */
  private async getAccessToken(): Promise<void> {
    try {
      const response = await axios.post(
        `${this.config.isPaper ? KIS_PAPER_BASE_URL : KIS_BASE_URL}/oauth2/tokenP`,
        {
          grant_type: 'client_credentials',
          appkey: this.config.appKey,
          appsecret: this.config.appSecret,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const tokenData: KisTokenResponse = response.data;
      this.accessToken = tokenData.access_token;
      // 토큰 만료 시간을 현재 시간 + expires_in - 5분(여유시간)으로 설정
      this.tokenExpiresAt = Date.now() + (tokenData.expires_in - 300) * 1000;
      
      console.log('KIS access token obtained successfully');
    } catch (error) {
      console.error('Failed to get KIS access token:', error);
      throw new Error('KIS API 토큰 발급에 실패했습니다.');
    }
  }

  /**
   * 계좌 잔고 조회
   */
  async getAccountBalance() {
    try {
      const response = await this.client.get('/uapi/domestic-stock/v1/trading/inquire-balance', {
        headers: {
          'appkey': this.config.appKey,
          'appsecret': this.config.appSecret,
          'tr_id': 'TTTC8434R',
        },
        params: {
          CANO: this.config.accountNumber.slice(0, 8),
          ACNT_PRDT_CD: this.config.accountNumber.slice(8),
          AFHR_FLPR_YN: 'N',
          OFL_YN: '',
          INQR_DVSN: '02',
          UNPR_DVSN: '01',
          FUND_STTL_ICLD_YN: 'N',
          FNCG_AMT_AUTO_RDPT_YN: 'N',
          PRCS_DVSN: '01',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Account balance inquiry failed:', error);
      throw new Error('계좌 잔고 조회에 실패했습니다.');
    }
  }

  /**
   * 주식 현재가 조회
   * @param stockCode - 주식 코드
   */
  async getStockPrice(stockCode: string) {
    try {
      const response = await this.client.get('/uapi/domestic-stock/v1/quotations/inquire-price', {
        headers: {
          'appkey': this.config.appKey,
          'appsecret': this.config.appSecret,
          'tr_id': 'FHKST01010100',
        },
        params: {
          FID_COND_MRKT_DIV_CODE: 'J',
          FID_INPUT_ISCD: stockCode,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Stock price inquiry failed:', error);
      throw new Error('주식 현재가 조회에 실패했습니다.');
    }
  }

  /**
   * 주식 주문
   * @param orderData - 주문 데이터
   */
  async placeOrder(orderData: {
    stockCode: string;
    orderType: 'buy' | 'sell';
    quantity: number;
    price?: number;
    orderCondition: '00' | '01' | '02'; // 지정가, 시장가, 조건부지정가
  }) {
    try {
      const trId = orderData.orderType === 'buy' ? 'TTTC0802U' : 'TTTC0801U';
      
      const response = await this.client.post('/uapi/domestic-stock/v1/trading/order-cash', {
        CANO: this.config.accountNumber.slice(0, 8),
        ACNT_PRDT_CD: this.config.accountNumber.slice(8),
        PDNO: orderData.stockCode,
        ORD_DVSN: orderData.orderCondition,
        ORD_QTY: orderData.quantity.toString(),
        ORD_UNPR: orderData.price?.toString() || '0',
      }, {
        headers: {
          'appkey': this.config.appKey,
          'appsecret': this.config.appSecret,
          'tr_id': trId,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Order placement failed:', error);
      throw new Error('주식 주문에 실패했습니다.');
    }
  }

  /**
   * 리소스 정리
   */
  destroy() {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }
} 