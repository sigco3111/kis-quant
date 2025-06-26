import { VercelRequest, VercelResponse } from '@vercel/node';
import { KisApiClient } from '../../utils/kis-client';
import { validateRequest, createApiResponse, createErrorResponse } from '../../utils/firebase-admin';
import { getClientIp, checkStrictRateLimit, createRateLimitHeaders } from '../../utils/rate-limiter';

/**
 * 주식 주문 API 프록시
 * POST /api/kis/orders
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
    // 엄격한 Rate Limiting 확인 (주문은 민감한 API)
    const clientIp = getClientIp(req);
    const rateLimitResult = checkStrictRateLimit(clientIp);
    
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
          message: '주문 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 요청 유효성 검증
    const { apiKeyData } = validateRequest(req.headers, req.body);
    const { 
      password, 
      stockCode, 
      orderType, 
      quantity, 
      price, 
      orderCondition,
      isPaper = false 
    } = req.body;

    // 필수 파라미터 검증
    if (!password) {
      res.status(400).json(createErrorResponse(new Error('복호화 비밀번호가 필요합니다.'), 400));
      return;
    }

    if (!stockCode || !orderType || !quantity || !orderCondition) {
      res.status(400).json(createErrorResponse(new Error('필수 주문 정보가 누락되었습니다.'), 400));
      return;
    }

    if (!['buy', 'sell'].includes(orderType)) {
      res.status(400).json(createErrorResponse(new Error('올바르지 않은 주문 타입입니다.'), 400));
      return;
    }

    if (!['00', '01', '02'].includes(orderCondition)) {
      res.status(400).json(createErrorResponse(new Error('올바르지 않은 주문 조건입니다.'), 400));
      return;
    }

    if (quantity <= 0) {
      res.status(400).json(createErrorResponse(new Error('주문 수량은 0보다 커야 합니다.'), 400));
      return;
    }

    // 지정가 주문인 경우 가격 필수
    if (orderCondition === '00' && (!price || price <= 0)) {
      res.status(400).json(createErrorResponse(new Error('지정가 주문은 가격이 필요합니다.'), 400));
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

    // 주문 실행
    const orderResult = await kisClient.placeOrder({
      stockCode,
      orderType,
      quantity: parseInt(quantity),
      price: price ? parseFloat(price) : undefined,
      orderCondition
    });

    // 리소스 정리
    kisClient.destroy();

    // 주문 로그 기록 (민감한 정보 제외)
    console.log('Order placed:', {
      stockCode,
      orderType,
      quantity,
      orderCondition,
      timestamp: new Date().toISOString(),
      clientIp
    });

    // 성공 응답
    res.status(200).json(createApiResponse(true, orderResult, '주문이 성공적으로 접수되었습니다.'));

  } catch (error: any) {
    console.error('Orders API error:', error);
    
    // 에러 타입에 따른 상태 코드 설정
    let statusCode = 500;
    if (error.message.includes('인증')) {
      statusCode = 401;
    } else if (error.message.includes('복호화')) {
      statusCode = 400;
    } else if (error.message.includes('API 키')) {
      statusCode = 400;
    } else if (error.message.includes('필수') || error.message.includes('올바르지')) {
      statusCode = 400;
    }

    res.status(statusCode).json(createErrorResponse(error, statusCode));
  }
} 