"""
기술 지표 계산 모듈
다양한 기술 지표를 계산하는 클래스를 제공합니다.
"""

import numpy as np
import pandas as pd
from typing import Tuple

class TechnicalIndicators:
    """
    기술 지표 계산 클래스
    """
    
    def sma(self, data: pd.Series, period: int) -> pd.Series:
        """
        단순이동평균 (Simple Moving Average)
        
        Args:
            data: 가격 데이터
            period: 이동평균 기간
            
        Returns:
            SMA 값들
        """
        return data.rolling(window=period, min_periods=period).mean()
    
    def ema(self, data: pd.Series, period: int) -> pd.Series:
        """
        지수이동평균 (Exponential Moving Average)
        
        Args:
            data: 가격 데이터
            period: 이동평균 기간
            
        Returns:
            EMA 값들
        """
        return data.ewm(span=period, adjust=False).mean()
    
    def rsi(self, data: pd.Series, period: int = 14) -> pd.Series:
        """
        상대강도지수 (Relative Strength Index)
        
        Args:
            data: 가격 데이터
            period: RSI 계산 기간
            
        Returns:
            RSI 값들 (0-100)
        """
        delta = data.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def macd(self, data: pd.Series, fast_period: int = 12, slow_period: int = 26, signal_period: int = 9) -> pd.DataFrame:
        """
        MACD (Moving Average Convergence Divergence)
        
        Args:
            data: 가격 데이터
            fast_period: 빠른 EMA 기간
            slow_period: 느린 EMA 기간
            signal_period: 신호선 EMA 기간
            
        Returns:
            MACD, Signal, Histogram 값들을 포함한 DataFrame
        """
        ema_fast = self.ema(data, fast_period)
        ema_slow = self.ema(data, slow_period)
        
        macd_line = ema_fast - ema_slow
        signal_line = self.ema(macd_line, signal_period)
        histogram = macd_line - signal_line
        
        return pd.DataFrame({
            'macd': macd_line,
            'signal': signal_line,
            'histogram': histogram
        })
    
    def bollinger_bands(self, data: pd.Series, period: int = 20, std_dev: float = 2) -> pd.DataFrame:
        """
        볼린저 밴드 (Bollinger Bands)
        
        Args:
            data: 가격 데이터
            period: 이동평균 기간
            std_dev: 표준편차 배수
            
        Returns:
            Upper, Middle, Lower 밴드 값들을 포함한 DataFrame
        """
        sma = self.sma(data, period)
        std = data.rolling(window=period).std()
        
        upper_band = sma + (std * std_dev)
        lower_band = sma - (std * std_dev)
        
        return pd.DataFrame({
            'upper': upper_band,
            'middle': sma,
            'lower': lower_band
        })
    
    def stochastic(self, high: pd.Series, low: pd.Series, close: pd.Series, 
                   k_period: int = 14, d_period: int = 3) -> pd.DataFrame:
        """
        스토캐스틱 오실레이터 (Stochastic Oscillator)
        
        Args:
            high: 고가 데이터
            low: 저가 데이터
            close: 종가 데이터
            k_period: %K 계산 기간
            d_period: %D 계산 기간
            
        Returns:
            %K, %D 값들을 포함한 DataFrame
        """
        lowest_low = low.rolling(window=k_period).min()
        highest_high = high.rolling(window=k_period).max()
        
        k_percent = 100 * ((close - lowest_low) / (highest_high - lowest_low))
        d_percent = k_percent.rolling(window=d_period).mean()
        
        return pd.DataFrame({
            'k': k_percent,
            'd': d_percent
        })
    
    def atr(self, high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
        """
        평균 실제 범위 (Average True Range)
        
        Args:
            high: 고가 데이터
            low: 저가 데이터
            close: 종가 데이터
            period: ATR 계산 기간
            
        Returns:
            ATR 값들
        """
        high_low = high - low
        high_close_prev = np.abs(high - close.shift())
        low_close_prev = np.abs(low - close.shift())
        
        true_range = pd.concat([high_low, high_close_prev, low_close_prev], axis=1).max(axis=1)
        atr = true_range.rolling(window=period).mean()
        
        return atr
    
    def williams_r(self, high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
        """
        윌리엄스 %R (Williams %R)
        
        Args:
            high: 고가 데이터
            low: 저가 데이터
            close: 종가 데이터
            period: 계산 기간
            
        Returns:
            Williams %R 값들 (-100 ~ 0)
        """
        highest_high = high.rolling(window=period).max()
        lowest_low = low.rolling(window=period).min()
        
        williams_r = -100 * ((highest_high - close) / (highest_high - lowest_low))
        
        return williams_r
    
    def cci(self, high: pd.Series, low: pd.Series, close: pd.Series, period: int = 20) -> pd.Series:
        """
        상품 채널 지수 (Commodity Channel Index)
        
        Args:
            high: 고가 데이터
            low: 저가 데이터
            close: 종가 데이터
            period: 계산 기간
            
        Returns:
            CCI 값들
        """
        typical_price = (high + low + close) / 3
        sma_tp = typical_price.rolling(window=period).mean()
        mean_deviation = typical_price.rolling(window=period).apply(
            lambda x: np.abs(x - x.mean()).mean(), raw=True
        )
        
        cci = (typical_price - sma_tp) / (0.015 * mean_deviation)
        
        return cci
    
    def momentum(self, data: pd.Series, period: int = 10) -> pd.Series:
        """
        모멘텀 (Momentum)
        
        Args:
            data: 가격 데이터
            period: 모멘텀 계산 기간
            
        Returns:
            모멘텀 값들
        """
        return data - data.shift(period)
    
    def roc(self, data: pd.Series, period: int = 10) -> pd.Series:
        """
        변화율 (Rate of Change)
        
        Args:
            data: 가격 데이터
            period: ROC 계산 기간
            
        Returns:
            ROC 값들 (%)
        """
        return ((data - data.shift(period)) / data.shift(period)) * 100 