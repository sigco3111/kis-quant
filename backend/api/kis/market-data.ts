import { VercelRequest, VercelResponse } from '@vercel/node';
import { KisApiClient } from '../../utils/kis-client';
import { validateRequest, createApiResponse, createErrorResponse } from '../../utils/firebase-admin';
import { getClientIp, checkRateLimit, createRateLimitHeaders } from '../../utils/rate-limiter';

/**
 * 시장 데이터 조회 API 프록시
 * POST /api/kis/market-data
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    res.status(405).json(createErrorResponse(new Error('Method not allowed'), 405));
    return;
  }

  try {
    // Rate Limiting 확인
    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit(clientIp);
    
    // Rate Limit 헤더 추가
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    if (!rateLimitResult.allowed) {
      res.status(429).json({
        success: false,
        error: {
          code: 429,
          message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 요청 유효성 검증
    const { apiKeyData } = validateRequest(req.headers, req.body);
    const { password, stockCode, isPaper = false } = req.body;

    if (!password) {
      res.status(400).json(createErrorResponse(new Error('복호화 비밀번호가 필요합니다.'), 400));
      return;
    }

    if (!stockCode) {
      res.status(400).json(createErrorResponse(new Error('주식 코드가 필요합니다.'), 400));
      return;
    }

    // KIS API 클라이언트 생성
    const kisClient = KisApiClient.createFromEncrypted(
      apiKeyData.encryptedApiKey,
      apiKeyData.encryptedSecret,
      apiKeyData.accountNumber,
      password,
      isPaper
    );

    // 주식 현재가 조회
    const marketData = await kisClient.getStockPrice(stockCode);

    // 리소스 정리
    kisClient.destroy();

    // 성공 응답
    res.status(200).json(createApiResponse(true, marketData, '시장 데이터 조회 성공'));

  } catch (error: any) {
    console.error('Market data API error:', error);
    
    // 에러 타입에 따른 상태 코드 설정
    let statusCode = 500;
    if (error.message.includes('인증')) {
      statusCode = 401;
    } else if (error.message.includes('복호화')) {
      statusCode = 400;
    } else if (error.message.includes('API 키')) {
      statusCode = 400;
    } else if (error.message.includes('주식 코드')) {
      statusCode = 400;
    }

    res.status(statusCode).json(createErrorResponse(error, statusCode));
  }
} 