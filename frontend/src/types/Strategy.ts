/**
 * 전략 관련 타입 정의
 * 퀀트 투자 전략의 구조와 설정을 정의합니다.
 */

// 기술 지표 타입
export type IndicatorType = 
  | 'SMA'    // 단순이동평균
  | 'EMA'    // 지수이동평균
  | 'RSI'    // 상대강도지수
  | 'MACD'   // MACD
  | 'BB'     // 볼린저밴드
  | 'STOCH'  // 스토캐스틱
  | 'VOLUME' // 거래량
  | 'PRICE'; // 가격

// 비교 연산자
export type ComparisonOperator = 
  | 'GT'     // 초과 (>)
  | 'GTE'    // 이상 (>=)
  | 'LT'     // 미만 (<)
  | 'LTE'    // 이하 (<=)
  | 'EQ'     // 같음 (=)
  | 'CROSS_UP'   // 상향돌파
  | 'CROSS_DOWN'; // 하향돌파

// 논리 연산자
export type LogicalOperator = 'AND' | 'OR';

// 기술 지표 설정
export interface IndicatorConfig {
  type: IndicatorType;
  period?: number;        // 기간 (이동평균, RSI 등)
  fastPeriod?: number;    // 빠른 기간 (MACD)
  slowPeriod?: number;    // 느린 기간 (MACD)
  signalPeriod?: number;  // 신호선 기간 (MACD)
  kPeriod?: number;       // %K 기간 (스토캐스틱)
  dPeriod?: number;       // %D 기간 (스토캐스틱)
  stdDev?: number;        // 표준편차 (볼린저밴드)
}

// 조건 설정
export interface Condition {
  id: string;
  leftIndicator: IndicatorConfig;
  operator: ComparisonOperator;
  rightIndicator?: IndicatorConfig;  // 지표 간 비교
  value?: number;                    // 고정값 비교
  description: string;               // 조건 설명
}

// 조건 그룹 (AND/OR 로직)
export interface ConditionGroup {
  id: string;
  conditions: Condition[];
  operator: LogicalOperator;
  description: string;
}

// 리스크 관리 설정
export interface RiskManagement {
  stopLoss?: number;      // 손절 비율 (%)
  takeProfit?: number;    // 익절 비율 (%)
  maxPosition?: number;   // 최대 포지션 크기 (%)
  maxDailyTrades?: number; // 일일 최대 거래 횟수
}

// 전략 설정
export interface Strategy {
  id: string;
  name: string;
  description: string;
  
  // 대상 종목
  symbols: string[];
  
  // 매수 조건
  buyConditions: ConditionGroup[];
  
  // 매도 조건
  sellConditions: ConditionGroup[];
  
  // 리스크 관리
  riskManagement: RiskManagement;
  
  // 메타데이터
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  version: number;
  
  // 백테스트 결과 (선택적)
  backtestResult?: BacktestResult;
}

// 백테스트 결과
export interface BacktestResult {
  id: string;
  strategyId: string;
  startDate: number;
  endDate: number;
  
  // 성과 지표
  totalReturn: number;        // 총 수익률 (%)
  annualizedReturn: number;   // 연간 수익률 (%)
  volatility: number;         // 변동성 (%)
  sharpeRatio: number;        // 샤프 비율
  maxDrawdown: number;        // 최대 낙폭 (%)
  
  // 거래 통계
  totalTrades: number;        // 총 거래 횟수
  winRate: number;            // 승률 (%)
  avgProfit: number;          // 평균 수익 (%)
  avgLoss: number;            // 평균 손실 (%)
  
  // 상세 거래 내역
  trades: BacktestTrade[];
  
  // 일별 수익률
  dailyReturns: DailyReturn[];
  
  createdAt: number;
}

// 백테스트 거래 내역
export interface BacktestTrade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  timestamp: number;
  pnl?: number;              // 손익 (매도 시)
  holdingPeriod?: number;    // 보유 기간 (일)
}

// 일별 수익률
export interface DailyReturn {
  date: number;
  portfolioValue: number;
  dailyReturn: number;
  cumulativeReturn: number;
}

// 전략 템플릿
export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'momentum' | 'mean_reversion' | 'trend_following' | 'custom';
  strategy: Omit<Strategy, 'id' | 'createdAt' | 'updatedAt'>;
  isPublic: boolean;
  usageCount: number;
}

// 전략 검증 결과
export interface StrategyValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// 전략 생성 요청
export interface CreateStrategyRequest {
  name: string;
  description: string;
  symbols: string[];
  buyConditions: ConditionGroup[];
  sellConditions: ConditionGroup[];
  riskManagement: RiskManagement;
}

// 전략 업데이트 요청
export interface UpdateStrategyRequest extends Partial<CreateStrategyRequest> {
  id: string;
  isActive?: boolean;
}

// 백테스트 설정
export interface BacktestConfig {
  strategyId: string;
  startDate: number;        // 백테스트 시작일
  endDate: number;          // 백테스트 종료일
  initialCapital: number;   // 초기 자본금
  commission: number;       // 수수료율 (%)
  slippage: number;         // 슬리피지 (%)
}

// 백테스트 진행 상태
export interface BacktestProgress {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;         // 0-100 (%)
  currentDate?: number;     // 현재 처리 중인 날짜
  message?: string;         // 상태 메시지
  estimatedTimeRemaining?: number; // 예상 남은 시간 (초)
}

// 백테스트 요청
export interface BacktestRequest {
  strategy: Strategy;
  config: BacktestConfig;
  useComplexEngine?: boolean; // true: Python 엔진, false: Vercel 엔진
}

// 백테스트 응답
export interface BacktestResponse {
  success: boolean;
  result?: BacktestResult;
  progress?: BacktestProgress;
  error?: string;
}

// 시장 데이터
export interface MarketData {
  symbol: string;
  date: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;
}

// 기술 지표 값
export interface IndicatorValue {
  date: number;
  value: number | { [key: string]: number }; // 단일 값 또는 복합 값 (MACD 등)
}

// 백테스트 캐시 키
export interface BacktestCacheKey {
  strategyHash: string;     // 전략 설정의 해시값
  configHash: string;       // 백테스트 설정의 해시값
  dataVersion: string;      // 시장 데이터 버전
} 