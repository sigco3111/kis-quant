"""
성과 지표 계산 모듈
백테스트 결과의 다양한 성과 지표를 계산합니다.
"""

import numpy as np
import pandas as pd
from typing import Dict, List
from decimal import Decimal

class PerformanceMetrics:
    """
    성과 지표 계산 클래스
    """
    
    def calculate_metrics(self, daily_returns: List[Dict], trades: List[Dict], initial_capital: float) -> Dict:
        """
        모든 성과 지표를 계산합니다.
        
        Args:
            daily_returns: 일별 수익률 데이터
            trades: 거래 내역
            initial_capital: 초기 자본금
            
        Returns:
            계산된 성과 지표들
        """
        if not daily_returns:
            return self._get_empty_metrics()
        
        # 기본 수익률 계산
        final_value = daily_returns[-1]['portfolioValue']
        total_return = (final_value / initial_capital - 1) * 100
        
        # 연환산 수익률 계산
        trading_days = len(daily_returns)
        if trading_days > 0:
            annualized_return = ((final_value / initial_capital) ** (252 / trading_days) - 1) * 100
        else:
            annualized_return = 0
        
        # 변동성 계산
        volatility = self._calculate_volatility(daily_returns)
        
        # 샤프 비율 계산
        sharpe_ratio = self._calculate_sharpe_ratio(daily_returns, annualized_return, volatility)
        
        # 최대 낙폭 계산
        max_drawdown = self._calculate_max_drawdown(daily_returns)
        
        # 거래 통계 계산
        trade_stats = self._calculate_trade_statistics(trades, initial_capital)
        
        return {
            'totalReturn': total_return,
            'annualizedReturn': annualized_return,
            'volatility': volatility,
            'sharpeRatio': sharpe_ratio,
            'maxDrawdown': max_drawdown,
            **trade_stats
        }
    
    def _get_empty_metrics(self) -> Dict:
        """빈 성과 지표 반환"""
        return {
            'totalReturn': 0,
            'annualizedReturn': 0,
            'volatility': 0,
            'sharpeRatio': 0,
            'maxDrawdown': 0,
            'totalTrades': 0,
            'winRate': 0,
            'avgProfit': 0,
            'avgLoss': 0
        }
    
    def _calculate_volatility(self, daily_returns: List[Dict]) -> float:
        """
        변동성 계산 (연환산)
        
        Args:
            daily_returns: 일별 수익률 데이터
            
        Returns:
            연환산 변동성 (%)
        """
        if len(daily_returns) < 2:
            return 0
        
        returns = [d['dailyReturn'] / 100 for d in daily_returns[1:]]  # 첫날 제외
        
        if not returns:
            return 0
        
        std_dev = np.std(returns, ddof=1)  # 표본 표준편차
        annualized_volatility = std_dev * np.sqrt(252) * 100  # 연환산
        
        return float(annualized_volatility)
    
    def _calculate_sharpe_ratio(self, daily_returns: List[Dict], annualized_return: float, volatility: float) -> float:
        """
        샤프 비율 계산
        
        Args:
            daily_returns: 일별 수익률 데이터
            annualized_return: 연환산 수익률
            volatility: 변동성
            
        Returns:
            샤프 비율
        """
        if volatility == 0:
            return 0
        
        risk_free_rate = 3.0  # 무위험 수익률 3% 가정
        excess_return = annualized_return - risk_free_rate
        sharpe_ratio = excess_return / volatility
        
        return float(sharpe_ratio)
    
    def _calculate_max_drawdown(self, daily_returns: List[Dict]) -> float:
        """
        최대 낙폭 계산
        
        Args:
            daily_returns: 일별 수익률 데이터
            
        Returns:
            최대 낙폭 (%)
        """
        if not daily_returns:
            return 0
        
        portfolio_values = [d['portfolioValue'] for d in daily_returns]
        peak = portfolio_values[0]
        max_drawdown = 0
        
        for value in portfolio_values:
            if value > peak:
                peak = value
            
            drawdown = (peak - value) / peak * 100
            if drawdown > max_drawdown:
                max_drawdown = drawdown
        
        return float(max_drawdown)
    
    def _calculate_trade_statistics(self, trades: List[Dict], initial_capital: float) -> Dict:
        """
        거래 통계 계산
        
        Args:
            trades: 거래 내역
            initial_capital: 초기 자본금
            
        Returns:
            거래 통계 지표들
        """
        if not trades:
            return {
                'totalTrades': 0,
                'winRate': 0,
                'avgProfit': 0,
                'avgLoss': 0
            }
        
        # 매도 거래만 필터링 (손익이 있는 거래)
        sell_trades = [t for t in trades if t['type'] == 'SELL' and 'pnl' in t]
        
        if not sell_trades:
            return {
                'totalTrades': len(trades),
                'winRate': 0,
                'avgProfit': 0,
                'avgLoss': 0
            }
        
        # 승부 거래 분류
        winning_trades = [t for t in sell_trades if t['pnl'] > 0]
        losing_trades = [t for t in sell_trades if t['pnl'] < 0]
        
        # 승률 계산
        win_rate = (len(winning_trades) / len(sell_trades)) * 100 if sell_trades else 0
        
        # 평균 수익 계산 (초기 자본 대비 %)
        avg_profit = 0
        if winning_trades:
            total_profit = sum(t['pnl'] for t in winning_trades)
            avg_profit = (total_profit / len(winning_trades)) / initial_capital * 100
        
        # 평균 손실 계산 (초기 자본 대비 %)
        avg_loss = 0
        if losing_trades:
            total_loss = sum(abs(t['pnl']) for t in losing_trades)
            avg_loss = (total_loss / len(losing_trades)) / initial_capital * 100
        
        return {
            'totalTrades': len(trades),
            'winRate': float(win_rate),
            'avgProfit': float(avg_profit),
            'avgLoss': float(avg_loss)
        }
    
    def calculate_sortino_ratio(self, daily_returns: List[Dict], annualized_return: float) -> float:
        """
        소르티노 비율 계산
        
        Args:
            daily_returns: 일별 수익률 데이터
            annualized_return: 연환산 수익률
            
        Returns:
            소르티노 비율
        """
        if len(daily_returns) < 2:
            return 0
        
        returns = [d['dailyReturn'] / 100 for d in daily_returns[1:]]
        negative_returns = [r for r in returns if r < 0]
        
        if not negative_returns:
            return float('inf')  # 음수 수익률이 없으면 무한대
        
        downside_deviation = np.std(negative_returns, ddof=1) * np.sqrt(252) * 100
        
        if downside_deviation == 0:
            return 0
        
        risk_free_rate = 3.0
        excess_return = annualized_return - risk_free_rate
        sortino_ratio = excess_return / downside_deviation
        
        return float(sortino_ratio)
    
    def calculate_calmar_ratio(self, daily_returns: List[Dict], annualized_return: float) -> float:
        """
        칼마 비율 계산
        
        Args:
            daily_returns: 일별 수익률 데이터
            annualized_return: 연환산 수익률
            
        Returns:
            칼마 비율
        """
        max_drawdown = self._calculate_max_drawdown(daily_returns)
        
        if max_drawdown == 0:
            return float('inf') if annualized_return > 0 else 0
        
        calmar_ratio = annualized_return / max_drawdown
        return float(calmar_ratio)
    
    def calculate_information_ratio(self, portfolio_returns: List[float], benchmark_returns: List[float]) -> float:
        """
        정보 비율 계산
        
        Args:
            portfolio_returns: 포트폴리오 수익률
            benchmark_returns: 벤치마크 수익률
            
        Returns:
            정보 비율
        """
        if len(portfolio_returns) != len(benchmark_returns) or len(portfolio_returns) < 2:
            return 0
        
        excess_returns = [p - b for p, b in zip(portfolio_returns, benchmark_returns)]
        
        if not excess_returns:
            return 0
        
        mean_excess_return = np.mean(excess_returns)
        tracking_error = np.std(excess_returns, ddof=1)
        
        if tracking_error == 0:
            return 0
        
        information_ratio = mean_excess_return / tracking_error
        return float(information_ratio)
    
    def calculate_beta(self, portfolio_returns: List[float], market_returns: List[float]) -> float:
        """
        베타 계산
        
        Args:
            portfolio_returns: 포트폴리오 수익률
            market_returns: 시장 수익률
            
        Returns:
            베타값
        """
        if len(portfolio_returns) != len(market_returns) or len(portfolio_returns) < 2:
            return 0
        
        portfolio_returns = np.array(portfolio_returns)
        market_returns = np.array(market_returns)
        
        covariance = np.cov(portfolio_returns, market_returns)[0][1]
        market_variance = np.var(market_returns, ddof=1)
        
        if market_variance == 0:
            return 0
        
        beta = covariance / market_variance
        return float(beta)
    
    def calculate_alpha(self, portfolio_return: float, market_return: float, beta: float, risk_free_rate: float = 3.0) -> float:
        """
        알파 계산
        
        Args:
            portfolio_return: 포트폴리오 수익률
            market_return: 시장 수익률
            beta: 베타값
            risk_free_rate: 무위험 수익률
            
        Returns:
            알파값
        """
        expected_return = risk_free_rate + beta * (market_return - risk_free_rate)
        alpha = portfolio_return - expected_return
        
        return float(alpha) 