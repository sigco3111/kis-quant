/**
 * Rate Limiting 유틸리티
 * API 호출 제한으로 과도한 요청을 방지
 */

interface RateLimitConfig {
  windowMs: number; // 시간 창 (밀리초)
  maxRequests: number; // 최대 요청 수
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * 메모리 기반 Rate Limiter
 * 프로덕션에서는 Redis 등 외부 저장소 사용 권장
 */
class MemoryRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // 주기적으로 만료된 엔트리 정리
    setInterval(() => {
      this.cleanup();
    }, this.config.windowMs);
  }

  /**
   * Rate Limit 확인
   * @param key - 식별자 (IP, 사용자 ID 등)
   * @returns 허용 여부와 남은 요청 수
   */
  checkLimit(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // 새로운 시간 창 시작
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.config.windowMs
      };
      this.store.set(key, newEntry);
      
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: newEntry.resetTime
      };
    }

    // 기존 시간 창 내에서 요청 수 증가
    entry.count++;
    this.store.set(key, entry);

    const allowed = entry.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - entry.count);

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime
    };
  }

  /**
   * 만료된 엔트리 정리
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * 특정 키의 제한 정보 리셋
   * @param key - 식별자
   */
  reset(key: string): void {
    this.store.delete(key);
  }
}

// 기본 Rate Limiter 인스턴스들
const defaultLimiter = new MemoryRateLimiter({
  windowMs: 60 * 1000, // 1분
  maxRequests: 100 // 분당 100회
});

const strictLimiter = new MemoryRateLimiter({
  windowMs: 60 * 1000, // 1분
  maxRequests: 30 // 분당 30회 (주문 등 민감한 API용)
});

/**
 * 클라이언트 IP 주소 추출
 * @param req - 요청 객체
 * @returns IP 주소
 */
export function getClientIp(req: any): string {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
}

/**
 * 기본 Rate Limit 확인
 * @param identifier - 식별자 (보통 IP 주소)
 * @returns Rate Limit 결과
 */
export function checkRateLimit(identifier: string) {
  return defaultLimiter.checkLimit(identifier);
}

/**
 * 엄격한 Rate Limit 확인 (주문 등 민감한 API용)
 * @param identifier - 식별자
 * @returns Rate Limit 결과
 */
export function checkStrictRateLimit(identifier: string) {
  return strictLimiter.checkLimit(identifier);
}

/**
 * Rate Limit 헤더 생성
 * @param result - Rate Limit 결과
 * @returns HTTP 헤더 객체
 */
export function createRateLimitHeaders(result: { remaining: number; resetTime: number }) {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };
}

/**
 * Rate Limit 에러 응답 생성
 * @param resetTime - 리셋 시간
 * @returns 에러 응답 객체
 */
export function createRateLimitError(resetTime: number) {
  return {
    success: false,
    error: {
      code: 429,
      message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Rate Limit 미들웨어 생성
 * @param strict - 엄격한 제한 사용 여부
 * @returns 미들웨어 함수
 */
export function createRateLimitMiddleware(strict: boolean = false) {
  return (req: any, res: any, next?: Function) => {
    const ip = getClientIp(req);
    const result = strict ? checkStrictRateLimit(ip) : checkRateLimit(ip);
    
    // Rate Limit 헤더 추가
    const headers = createRateLimitHeaders(result);
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    if (!result.allowed) {
      const error = createRateLimitError(result.resetTime);
      res.status(429).json(error);
      return;
    }

    if (next) {
      next();
    }
  };
} 