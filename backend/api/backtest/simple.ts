/**
 * 간단한 백테스트 엔진 (Vercel Functions)
 * 단순한 전략에 대한 빠른 백테스트를 제공합니다.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  BacktestRequest, 
  BacktestResponse, 
  BacktestResult, 
  MarketData,
  IndicatorValue,
  BacktestTrade,
  DailyReturn
} from '../../types/backtest';

interface SimpleIndicatorCalculator {
  sma(data: number[], period: number): number[];
  ema(data: number[], period: number): number[];
  rsi(data: number[], period: number): number[];
}

/**
 * 간단한 기술 지표 계산기
 */
const indicators: SimpleIndicatorCalculator = {
  /**
   * 단순이동평균 계산
   */
  sma(data: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    return result;
  },

  /**
   * 지수이동평균 계산
   */
  ema(data: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // 첫 번째 EMA는 SMA로 계산
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result.push(ema);
    
    // 나머지 EMA 계산
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
      result.push(ema);
    }
    
    return result;
  },

  /**
   * RSI 계산
   */
  rsi(data: number[], period: number): number[] {
    const result: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];
    
    // 가격 변화 계산
    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    // RSI 계산
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        result.push(rsi);
      }
    }
    
    return result;
  }
};

/**
 * 모의 시장 데이터 생성
 */
function generateMockData(symbol: string, startDate: number, endDate: number): MarketData[] {
  const data: MarketData[] = [];
  const days = Math.floor((endDate - startDate) / (24 * 60 * 60 * 1000));
  
  let currentPrice = 50000; // 초기 가격
  const currentDate = new Date(startDate);
  
  for (let i = 0; i < days; i++) {
    // 랜덤 워크로 가격 변동 시뮬레이션
    const change = (Math.random() - 0.5) * 0.04; // ±2% 변동
    currentPrice *= (1 + change);
    
    const open = currentPrice;
    const high = currentPrice * (1 + Math.random() * 0.02);
    const low = currentPrice * (1 - Math.random() * 0.02);
    const close = currentPrice;
    const volume = Math.floor(Math.random() * 1000000) + 100000;
    
    data.push({
      symbol,
      date: currentDate.getTime(),
      open,
      high,
      low,
      close,
      volume
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return data;
}

/**
 * 간단한 백테스트 실행
 */
function runSimpleBacktest(request: BacktestRequest): BacktestResult {
  const { strategy, config } = request;
  
  // 모의 데이터 생성
  const marketData: { [symbol: string]: MarketData[] } = {};
  for (const symbol of strategy.symbols) {
    marketData[symbol] = generateMockData(symbol, config.startDate, config.endDate);
  }
  
  // 초기 설정
  let cash = config.initialCapital;
  const positions: { [symbol: string]: number } = {};
  const trades: BacktestTrade[] = [];
  const dailyReturns: DailyReturn[] = [];
  
  // 첫 번째 종목의 데이터를 기준으로 날짜 순회
  const primarySymbol = strategy.symbols[0];
  const primaryData = marketData[primarySymbol];
  
  for (let i = 20; i < primaryData.length; i++) { // 지표 계산을 위해 20일 후부터 시작
    const currentDate = primaryData[i].date;
    
    // 각 종목에 대해 신호 확인
    for (const symbol of strategy.symbols) {
      const symbolData = marketData[symbol];
      const prices = symbolData.slice(0, i + 1).map(d => d.close);
      
      // 기술 지표 계산
      const sma5 = indicators.sma(prices, 5);
      const sma20 = indicators.sma(prices, 20);
      
      if (sma5.length < 2 || sma20.length < 2) continue;
      
      const currentPrice = symbolData[i].close;
      const currentSma5 = sma5[sma5.length - 1];
      const prevSma5 = sma5[sma5.length - 2];
      const currentSma20 = sma20[sma20.length - 1];
      const prevSma20 = sma20[sma20.length - 2];
      
      // 골든 크로스 매수 신호 (5일 SMA가 20일 SMA 상향돌파)
      if ((!positions[symbol] || positions[symbol] === 0) && 
          prevSma5 <= prevSma20 && currentSma5 > currentSma20) {
        
        const buyPrice = currentPrice * (1 + config.slippage / 100);
        const commission = buyPrice * (config.commission / 100);
        const maxShares = Math.floor(cash / (buyPrice + commission));
        const shares = Math.min(maxShares, 100); // 최대 100주
        
        if (shares > 0) {
          const totalCost = shares * (buyPrice + commission);
          
          trades.push({
            id: `trade_${trades.length + 1}`,
            symbol,
            type: 'BUY',
            quantity: shares,
            price: buyPrice,
            timestamp: currentDate
          });
          
          cash -= totalCost;
          positions[symbol] = shares;
        }
      }
      
      // 데드 크로스 매도 신호 (5일 SMA가 20일 SMA 하향돌파)
      else if (positions[symbol] > 0 && 
               prevSma5 >= prevSma20 && currentSma5 < currentSma20) {
        
        const sellPrice = currentPrice * (1 - config.slippage / 100);
        const commission = sellPrice * (config.commission / 100);
        const shares = positions[symbol];
        const totalReceived = shares * (sellPrice - commission);
        
        // 손익 계산
        const buyTrade = trades.filter(t => t.symbol === symbol && t.type === 'BUY').pop();
        let pnl = 0;
        if (buyTrade) {
          const buyCost = shares * buyTrade.price;
          pnl = totalReceived - buyCost;
        }
        
        trades.push({
          id: `trade_${trades.length + 1}`,
          symbol,
          type: 'SELL',
          quantity: shares,
          price: sellPrice,
          timestamp: currentDate,
          pnl
        });
        
        cash += totalReceived;
        positions[symbol] = 0;
      }
    }
    
    // 일별 포트폴리오 가치 계산
    let portfolioValue = cash;
    for (const [symbol, quantity] of Object.entries(positions)) {
      if (quantity > 0) {
        portfolioValue += quantity * marketData[symbol][i].close;
      }
    }
    
    const dailyReturn = i > 20 ? 
      ((portfolioValue / dailyReturns[dailyReturns.length - 1].portfolioValue) - 1) * 100 : 0;
    const cumulativeReturn = ((portfolioValue / config.initialCapital) - 1) * 100;
    
    dailyReturns.push({
      date: currentDate,
      portfolioValue,
      dailyReturn,
      cumulativeReturn
    });
  }
  
  // 성과 지표 계산
  const finalValue = dailyReturns[dailyReturns.length - 1]?.portfolioValue || config.initialCapital;
  const totalReturn = ((finalValue / config.initialCapital) - 1) * 100;
  const tradingDays = dailyReturns.length;
  const annualizedReturn = tradingDays > 0 ? 
    (Math.pow(finalValue / config.initialCapital, 252 / tradingDays) - 1) * 100 : 0;
  
  // 변동성 계산
  const returns = dailyReturns.slice(1).map(d => d.dailyReturn / 100);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance * 252) * 100;
  
  // 샤프 비율
  const riskFreeRate = 3.0; // 3% 가정
  const sharpeRatio = volatility > 0 ? (annualizedReturn - riskFreeRate) / volatility : 0;
  
  // 최대 낙폭 계산
  let maxDrawdown = 0;
  let peak = config.initialCapital;
  for (const daily of dailyReturns) {
    if (daily.portfolioValue > peak) {
      peak = daily.portfolioValue;
    }
    const drawdown = ((peak - daily.portfolioValue) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  // 거래 통계
  const sellTrades = trades.filter(t => t.type === 'SELL' && t.pnl !== undefined);
  const winningTrades = sellTrades.filter(t => (t.pnl || 0) > 0);
  const losingTrades = sellTrades.filter(t => (t.pnl || 0) < 0);
  
  const winRate = sellTrades.length > 0 ? (winningTrades.length / sellTrades.length) * 100 : 0;
  const avgProfit = winningTrades.length > 0 ? 
    (winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length) / config.initialCapital * 100 : 0;
  const avgLoss = losingTrades.length > 0 ? 
    (losingTrades.reduce((sum, t) => sum + Math.abs(t.pnl || 0), 0) / losingTrades.length) / config.initialCapital * 100 : 0;
  
  return {
    id: `backtest_${Date.now()}`,
    strategyId: strategy.id,
    startDate: config.startDate,
    endDate: config.endDate,
    totalReturn,
    annualizedReturn,
    volatility,
    sharpeRatio,
    maxDrawdown,
    totalTrades: trades.length,
    winRate,
    avgProfit,
    avgLoss,
    trades,
    dailyReturns,
    createdAt: Date.now()
  };
}

/**
 * Vercel Function 핸들러
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method Not Allowed' 
    });
  }
  
  try {
    const request: BacktestRequest = req.body;
    
    // 요청 검증
    if (!request.strategy || !request.config) {
      return res.status(400).json({
        success: false,
        error: '전략과 설정이 필요합니다.'
      });
    }
    
    if (!request.strategy.symbols || request.strategy.symbols.length === 0) {
      return res.status(400).json({
        success: false,
        error: '최소 하나의 종목이 필요합니다.'
      });
    }
    
    // 백테스트 실행
    const result = runSimpleBacktest(request);
    
    const response: BacktestResponse = {
      success: true,
      result
    };
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('백테스트 오류:', error);
    
    const response: BacktestResponse = {
      success: false,
      error: error instanceof Error ? error.message : '백테스트 실행 중 오류가 발생했습니다.'
    };
    
    return res.status(500).json(response);
  }
} 