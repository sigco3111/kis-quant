/**
 * 백테스트 관련 타입 정의 (백엔드용)
 */

// 기술 지표 타입
export type IndicatorType = 
  | 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BB' | 'STOCH' | 'VOLUME' | 'PRICE';

// 비교 연산자
export type ComparisonOperator = 
  | 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'CROSS_UP' | 'CROSS_DOWN';

// 논리 연산자
export type LogicalOperator = 'AND' | 'OR';

// 기술 지표 설정
export interface IndicatorConfig {
  type: IndicatorType;
  period?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  kPeriod?: number;
  dPeriod?: number;
  stdDev?: number;
}

// 조건 설정
export interface Condition {
  id: string;
  leftIndicator: IndicatorConfig;
  operator: ComparisonOperator;
  rightIndicator?: IndicatorConfig;
  value?: number;
  description: string;
}

// 조건 그룹
export interface ConditionGroup {
  id: string;
  conditions: Condition[];
  operator: LogicalOperator;
  description: string;
}

// 리스크 관리 설정
export interface RiskManagement {
  stopLoss?: number;
  takeProfit?: number;
  maxPosition?: number;
  maxDailyTrades?: number;
}

// 전략 설정
export interface Strategy {
  id: string;
  name: string;
  description: string;
  symbols: string[];
  buyConditions: ConditionGroup[];
  sellConditions: ConditionGroup[];
  riskManagement: RiskManagement;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  version: number;
  backtestResult?: BacktestResult;
}

// 백테스트 거래 내역
export interface BacktestTrade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  timestamp: number;
  pnl?: number;
  holdingPeriod?: number;
}

// 일별 수익률
export interface DailyReturn {
  date: number;
  portfolioValue: number;
  dailyReturn: number;
  cumulativeReturn: number;
}

// 백테스트 결과
export interface BacktestResult {
  id: string;
  strategyId: string;
  startDate: number;
  endDate: number;
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
  winRate: number;
  avgProfit: number;
  avgLoss: number;
  trades: BacktestTrade[];
  dailyReturns: DailyReturn[];
  createdAt: number;
}

// 백테스트 설정
export interface BacktestConfig {
  strategyId: string;
  startDate: number;
  endDate: number;
  initialCapital: number;
  commission: number;
  slippage: number;
}

// 백테스트 진행 상태
export interface BacktestProgress {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  currentDate?: number;
  message?: string;
  estimatedTimeRemaining?: number;
}

// 백테스트 요청
export interface BacktestRequest {
  strategy: Strategy;
  config: BacktestConfig;
  useComplexEngine?: boolean;
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
  value: number | { [key: string]: number };
} 