"""
고성능 백테스트 엔진 (Python)
복잡한 전략에 대한 정밀한 백테스트를 제공합니다.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from decimal import Decimal, ROUND_HALF_UP

from .indicators import TechnicalIndicators
from .metrics import PerformanceMetrics

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BacktestEngine:
    """
    고성능 백테스트 엔진
    """
    
    def __init__(self):
        self.indicators = TechnicalIndicators()
        self.metrics = PerformanceMetrics()
        self.progress_callback = None
        
    def set_progress_callback(self, callback):
        """진행률 콜백 함수 설정"""
        self.progress_callback = callback
        
    async def run_backtest(self, strategy: Dict, config: Dict) -> Dict:
        """
        백테스트 실행
        
        Args:
            strategy: 전략 설정
            config: 백테스트 설정
            
        Returns:
            백테스트 결과
        """
        try:
            logger.info(f"백테스트 시작: {strategy.get('name', 'Unknown')}")
            
            # 설정 검증
            self._validate_inputs(strategy, config)
            
            # 시장 데이터 로드
            market_data = await self._load_market_data(
                strategy['symbols'], 
                config['startDate'], 
                config['endDate']
            )
            
            # 기술 지표 계산
            indicators_data = await self._calculate_indicators(strategy, market_data)
            
            # 백테스트 실행
            result = await self._execute_backtest(strategy, config, market_data, indicators_data)
            
            logger.info("백테스트 완료")
            return result
            
        except Exception as e:
            logger.error(f"백테스트 실행 오류: {str(e)}")
            raise
    
    def _validate_inputs(self, strategy: Dict, config: Dict):
        """입력 데이터 검증"""
        required_strategy_fields = ['id', 'name', 'symbols', 'buyConditions', 'sellConditions']
        for field in required_strategy_fields:
            if field not in strategy:
                raise ValueError(f"전략에 필수 필드 '{field}'가 없습니다.")
        
        required_config_fields = ['startDate', 'endDate', 'initialCapital', 'commission', 'slippage']
        for field in required_config_fields:
            if field not in config:
                raise ValueError(f"설정에 필수 필드 '{field}'가 없습니다.")
        
        if config['startDate'] >= config['endDate']:
            raise ValueError("시작일이 종료일보다 늦습니다.")
        
        if config['initialCapital'] <= 0:
            raise ValueError("초기 자본금은 0보다 커야 합니다.")
    
    async def _load_market_data(self, symbols: List[str], start_date: int, end_date: int) -> Dict[str, pd.DataFrame]:
        """
        시장 데이터 로드 (모의 데이터)
        실제로는 KIS API나 데이터베이스에서 가져와야 함
        """
        market_data = {}
        
        for symbol in symbols:
            # 모의 데이터 생성
            dates = pd.date_range(
                start=pd.to_datetime(start_date, unit='ms'),
                end=pd.to_datetime(end_date, unit='ms'),
                freq='D'
            )
            
            # 랜덤 워크로 가격 시뮬레이션
            np.random.seed(42)  # 재현 가능한 결과를 위해
            returns = np.random.normal(0.001, 0.02, len(dates))  # 일일 수익률
            
            initial_price = 50000
            prices = [initial_price]
            for ret in returns[1:]:
                prices.append(prices[-1] * (1 + ret))
            
            # OHLCV 데이터 생성
            df = pd.DataFrame({
                'date': dates,
                'open': prices,
                'high': [p * (1 + np.random.uniform(0, 0.02)) for p in prices],
                'low': [p * (1 - np.random.uniform(0, 0.02)) for p in prices],
                'close': prices,
                'volume': np.random.randint(100000, 1000000, len(dates)),
                'symbol': symbol
            })
            
            market_data[symbol] = df
            
        return market_data
    
    async def _calculate_indicators(self, strategy: Dict, market_data: Dict[str, pd.DataFrame]) -> Dict:
        """기술 지표 계산"""
        indicators_data = {}
        
        for symbol, df in market_data.items():
            symbol_indicators = {}
            
            # 모든 조건에서 사용되는 지표들을 추출하여 계산
            all_conditions = []
            for group in strategy['buyConditions'] + strategy['sellConditions']:
                all_conditions.extend(group['conditions'])
            
            # 필요한 지표들 계산
            for condition in all_conditions:
                left_indicator = condition['leftIndicator']
                right_indicator = condition.get('rightIndicator')
                
                # 왼쪽 지표 계산
                indicator_key = self._get_indicator_key(left_indicator)
                if indicator_key not in symbol_indicators:
                    symbol_indicators[indicator_key] = self._calculate_single_indicator(df, left_indicator)
                
                # 오른쪽 지표 계산 (있는 경우)
                if right_indicator:
                    right_key = self._get_indicator_key(right_indicator)
                    if right_key not in symbol_indicators:
                        symbol_indicators[right_key] = self._calculate_single_indicator(df, right_indicator)
            
            indicators_data[symbol] = symbol_indicators
        
        return indicators_data
    
    def _get_indicator_key(self, indicator_config: Dict) -> str:
        """지표 설정을 기반으로 고유 키 생성"""
        key_parts = [indicator_config['type']]
        
        if 'period' in indicator_config:
            key_parts.append(f"period_{indicator_config['period']}")
        if 'fastPeriod' in indicator_config:
            key_parts.append(f"fast_{indicator_config['fastPeriod']}")
        if 'slowPeriod' in indicator_config:
            key_parts.append(f"slow_{indicator_config['slowPeriod']}")
        if 'signalPeriod' in indicator_config:
            key_parts.append(f"signal_{indicator_config['signalPeriod']}")
        if 'stdDev' in indicator_config:
            key_parts.append(f"std_{indicator_config['stdDev']}")
        
        return "_".join(key_parts)
    
    def _calculate_single_indicator(self, df: pd.DataFrame, indicator_config: Dict) -> pd.Series:
        """단일 기술 지표 계산"""
        indicator_type = indicator_config['type']
        
        if indicator_type == 'SMA':
            period = indicator_config.get('period', 20)
            return self.indicators.sma(df['close'], period)
        
        elif indicator_type == 'EMA':
            period = indicator_config.get('period', 20)
            return self.indicators.ema(df['close'], period)
        
        elif indicator_type == 'RSI':
            period = indicator_config.get('period', 14)
            return self.indicators.rsi(df['close'], period)
        
        elif indicator_type == 'MACD':
            fast = indicator_config.get('fastPeriod', 12)
            slow = indicator_config.get('slowPeriod', 26)
            signal = indicator_config.get('signalPeriod', 9)
            return self.indicators.macd(df['close'], fast, slow, signal)
        
        elif indicator_type == 'BB':
            period = indicator_config.get('period', 20)
            std_dev = indicator_config.get('stdDev', 2)
            return self.indicators.bollinger_bands(df['close'], period, std_dev)
        
        elif indicator_type == 'STOCH':
            k_period = indicator_config.get('kPeriod', 14)
            d_period = indicator_config.get('dPeriod', 3)
            return self.indicators.stochastic(df['high'], df['low'], df['close'], k_period, d_period)
        
        elif indicator_type == 'VOLUME':
            return df['volume']
        
        elif indicator_type == 'PRICE':
            return df['close']
        
        else:
            raise ValueError(f"지원하지 않는 지표 타입: {indicator_type}")
    
    async def _execute_backtest(self, strategy: Dict, config: Dict, market_data: Dict, indicators_data: Dict) -> Dict:
        """백테스트 실행"""
        
        # 초기 설정
        initial_capital = Decimal(str(config['initialCapital']))
        commission_rate = Decimal(str(config['commission'])) / 100
        slippage_rate = Decimal(str(config['slippage'])) / 100
        
        # 포트폴리오 상태
        cash = initial_capital
        positions = {}  # {symbol: quantity}
        trades = []
        daily_returns = []
        
        # 첫 번째 종목의 데이터를 기준으로 날짜 순회
        primary_symbol = strategy['symbols'][0]
        primary_data = market_data[primary_symbol]
        
        total_days = len(primary_data)
        
        for i, (_, row) in enumerate(primary_data.iterrows()):
            current_date = row['date']
            
            # 진행률 업데이트
            if self.progress_callback:
                progress = (i / total_days) * 100
                await self.progress_callback({
                    'progress': progress,
                    'currentDate': int(current_date.timestamp() * 1000),
                    'message': f"백테스트 진행 중... ({i+1}/{total_days})"
                })
            
            # 각 종목에 대해 신호 확인
            for symbol in strategy['symbols']:
                if symbol not in market_data:
                    continue
                
                symbol_data = market_data[symbol]
                symbol_indicators = indicators_data[symbol]
                
                # 해당 날짜의 데이터 찾기
                current_row = symbol_data[symbol_data['date'] == current_date]
                if current_row.empty:
                    continue
                
                current_row = current_row.iloc[0]
                current_price = Decimal(str(current_row['close']))
                
                # 매수 신호 확인
                if symbol not in positions or positions[symbol] == 0:
                    if self._check_buy_signals(strategy['buyConditions'], symbol_indicators, i):
                        # 매수 실행
                        buy_price = current_price * (1 + slippage_rate)
                        max_shares = int(cash / buy_price)
                        
                        # 리스크 관리 적용
                        max_position = strategy.get('riskManagement', {}).get('maxPosition', 100)
                        position_limit = int((initial_capital * Decimal(str(max_position)) / 100) / buy_price)
                        shares = min(max_shares, position_limit)
                        
                        if shares > 0:
                            total_cost = shares * buy_price * (1 + commission_rate)
                            
                            if total_cost <= cash:
                                trades.append({
                                    'id': f"trade_{len(trades) + 1}",
                                    'symbol': symbol,
                                    'type': 'BUY',
                                    'quantity': shares,
                                    'price': float(buy_price),
                                    'timestamp': int(current_date.timestamp() * 1000)
                                })
                                
                                cash -= total_cost
                                positions[symbol] = shares
                
                # 매도 신호 확인
                elif positions[symbol] > 0:
                    if self._check_sell_signals(strategy['sellConditions'], symbol_indicators, i):
                        # 매도 실행
                        sell_price = current_price * (1 - slippage_rate)
                        shares = positions[symbol]
                        total_received = shares * sell_price * (1 - commission_rate)
                        
                        # 손익 계산
                        buy_trade = next((t for t in reversed(trades) if t['symbol'] == symbol and t['type'] == 'BUY'), None)
                        pnl = 0
                        holding_period = 0
                        
                        if buy_trade:
                            buy_cost = shares * Decimal(str(buy_trade['price'])) * (1 + commission_rate)
                            pnl = float(total_received - buy_cost)
                            holding_period = (int(current_date.timestamp() * 1000) - buy_trade['timestamp']) // (24 * 60 * 60 * 1000)
                        
                        trades.append({
                            'id': f"trade_{len(trades) + 1}",
                            'symbol': symbol,
                            'type': 'SELL',
                            'quantity': shares,
                            'price': float(sell_price),
                            'timestamp': int(current_date.timestamp() * 1000),
                            'pnl': pnl,
                            'holdingPeriod': holding_period
                        })
                        
                        cash += total_received
                        positions[symbol] = 0
            
            # 일별 포트폴리오 가치 계산
            portfolio_value = cash
            for symbol, quantity in positions.items():
                if quantity > 0 and symbol in market_data:
                    symbol_data = market_data[symbol]
                    current_row = symbol_data[symbol_data['date'] == current_date]
                    if not current_row.empty:
                        current_price = Decimal(str(current_row.iloc[0]['close']))
                        portfolio_value += quantity * current_price
            
            daily_return = 0
            if i > 0 and daily_returns:
                prev_value = Decimal(str(daily_returns[-1]['portfolioValue']))
                daily_return = float((portfolio_value / prev_value - 1) * 100)
            
            cumulative_return = float((portfolio_value / initial_capital - 1) * 100)
            
            daily_returns.append({
                'date': int(current_date.timestamp() * 1000),
                'portfolioValue': float(portfolio_value),
                'dailyReturn': daily_return,
                'cumulativeReturn': cumulative_return
            })
        
        # 성과 지표 계산
        performance_metrics = self.metrics.calculate_metrics(
            daily_returns, trades, float(initial_capital)
        )
        
        # 결과 생성
        result = {
            'id': f"backtest_{int(datetime.now().timestamp() * 1000)}",
            'strategyId': strategy['id'],
            'startDate': config['startDate'],
            'endDate': config['endDate'],
            'trades': trades,
            'dailyReturns': daily_returns,
            'createdAt': int(datetime.now().timestamp() * 1000),
            **performance_metrics
        }
        
        return result
    
    def _check_buy_signals(self, buy_conditions: List[Dict], indicators: Dict, current_index: int) -> bool:
        """매수 신호 확인"""
        # 조건 그룹들을 OR로 연결 (하나라도 만족하면 매수)
        for group in buy_conditions:
            if self._evaluate_condition_group(group, indicators, current_index):
                return True
        return False
    
    def _check_sell_signals(self, sell_conditions: List[Dict], indicators: Dict, current_index: int) -> bool:
        """매도 신호 확인"""
        # 조건 그룹들을 OR로 연결 (하나라도 만족하면 매도)
        for group in sell_conditions:
            if self._evaluate_condition_group(group, indicators, current_index):
                return True
        return False
    
    def _evaluate_condition_group(self, group: Dict, indicators: Dict, current_index: int) -> bool:
        """조건 그룹 평가"""
        conditions = group['conditions']
        operator = group['operator']
        
        results = []
        for condition in conditions:
            result = self._evaluate_single_condition(condition, indicators, current_index)
            results.append(result)
        
        if operator == 'AND':
            return all(results)
        elif operator == 'OR':
            return any(results)
        else:
            return False
    
    def _evaluate_single_condition(self, condition: Dict, indicators: Dict, current_index: int) -> bool:
        """단일 조건 평가"""
        try:
            left_key = self._get_indicator_key(condition['leftIndicator'])
            operator = condition['operator']
            
            if left_key not in indicators:
                return False
            
            left_values = indicators[left_key]
            
            # 인덱스 범위 확인
            if current_index >= len(left_values) or current_index < 1:
                return False
            
            left_current = left_values.iloc[current_index] if hasattr(left_values, 'iloc') else left_values[current_index]
            
            # 오른쪽 값 결정
            if 'rightIndicator' in condition and condition['rightIndicator']:
                right_key = self._get_indicator_key(condition['rightIndicator'])
                if right_key not in indicators:
                    return False
                
                right_values = indicators[right_key]
                if current_index >= len(right_values):
                    return False
                
                right_current = right_values.iloc[current_index] if hasattr(right_values, 'iloc') else right_values[current_index]
                
                # 크로스 오버/언더 확인을 위한 이전 값
                if operator in ['CROSS_UP', 'CROSS_DOWN']:
                    if current_index < 1:
                        return False
                    
                    left_prev = left_values.iloc[current_index - 1] if hasattr(left_values, 'iloc') else left_values[current_index - 1]
                    right_prev = right_values.iloc[current_index - 1] if hasattr(right_values, 'iloc') else right_values[current_index - 1]
                    
                    if operator == 'CROSS_UP':
                        return left_prev <= right_prev and left_current > right_current
                    elif operator == 'CROSS_DOWN':
                        return left_prev >= right_prev and left_current < right_current
                
                # 일반 비교
                right_value = right_current
            else:
                right_value = condition.get('value', 0)
            
            # 조건 평가
            if operator == 'GT':
                return left_current > right_value
            elif operator == 'GTE':
                return left_current >= right_value
            elif operator == 'LT':
                return left_current < right_value
            elif operator == 'LTE':
                return left_current <= right_value
            elif operator == 'EQ':
                return abs(left_current - right_value) < 1e-6  # 부동소수점 비교
            
            return False
            
        except Exception as e:
            logger.warning(f"조건 평가 오류: {str(e)}")
            return False 