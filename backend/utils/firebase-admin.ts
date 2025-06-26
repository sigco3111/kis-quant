/**
 * 인증 및 API 키 관리 유틸리티
 * localStorage 기반 시스템에서 클라이언트 인증 및 API 키 처리
 */

/**
 * 요청 헤더에서 인증 토큰 추출
 * @param headers - 요청 헤더
 * @returns 인증 토큰 또는 null
 */
export function extractAuthToken(headers: any): string | null {
  const authorization = headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  return authorization.substring(7);
}

/**
 * 기본 인증 검증 (현재는 토큰 존재 여부만 확인)
 * 향후 Firebase 익명 인증 토큰 검증으로 확장 가능
 * @param token - 인증 토큰
 * @returns 검증 결과
 */
export function verifyBasicAuth(token: string): boolean {
  try {
    // 현재는 기본적인 토큰 형식만 확인
    // 향후 Firebase 익명 토큰 검증으로 확장
    return Boolean(token && token.length > 0);
  } catch (error) {
    console.error('Auth verification failed:', error);
    return false;
  }
}

/**
 * 요청 본문에서 암호화된 API 키 데이터 추출
 * @param body - 요청 본문
 * @returns API 키 데이터
 */
export function extractApiKeyData(body: any) {
  const { encryptedApiKey, encryptedSecret, accountNumber } = body;
  
  if (!encryptedApiKey || !encryptedSecret || !accountNumber) {
    throw new Error('필수 API 키 정보가 누락되었습니다.');
  }

  return {
    encryptedApiKey,
    encryptedSecret,
    accountNumber
  };
}

/**
 * 요청 유효성 검증
 * @param headers - 요청 헤더
 * @param body - 요청 본문
 * @returns 검증 결과
 */
export function validateRequest(headers: any, body: any) {
  // 인증 토큰 확인
  const token = extractAuthToken(headers);
  if (!token || !verifyBasicAuth(token)) {
    throw new Error('인증이 필요합니다.');
  }

  // API 키 데이터 확인
  const apiKeyData = extractApiKeyData(body);
  
  return {
    token,
    apiKeyData
  };
}

/**
 * 표준 API 응답 형식 생성
 * @param success - 성공 여부
 * @param data - 응답 데이터
 * @param message - 메시지
 * @returns 표준 응답 객체
 */
export function createApiResponse(success: boolean, data?: any, message?: string) {
  return {
    success,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

/**
 * 에러 응답 생성
 * @param error - 에러 객체
 * @param statusCode - HTTP 상태 코드
 * @returns 에러 응답 객체
 */
export function createErrorResponse(error: any, statusCode: number = 500) {
  return {
    success: false,
    error: {
      code: statusCode,
      message: error.message || '알 수 없는 오류가 발생했습니다.',
    },
    timestamp: new Date().toISOString()
  };
} 