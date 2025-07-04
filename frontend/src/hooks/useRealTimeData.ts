/**
 * 실시간 데이터 구독 훅
 * Firebase Realtime Database에서 사용자 데이터를 실시간으로 구독합니다.
 */

import { useState, useEffect } from 'react';
import { firebaseService } from '../services/FirebaseService';
import StrategyService from '../services/StrategyService';
import { Strategy as FullStrategy } from '../types/Strategy';

// 계좌 정보 인터페이스
export interface AccountInfo {
  totalAssets: number;
  availableCash: number;
  profitRate: number;
  profitAmount: number;
  lastUpdated: number;
}

// 전략 정보 인터페이스 (실행 상태 중심)
export interface Strategy {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'stopped';
  profitRate: number;
  profitAmount: number;
  startDate: number;
  lastUpdated: number;
}

// 매매 내역 인터페이스
export interface TradeRecord {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  amount: number;
  timestamp: number;
  strategyId?: string;
}

// 실시간 데이터 상태
export interface RealTimeData {
  accountInfo: AccountInfo | null;
  strategies: Strategy[];
  recentTrades: TradeRecord[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

/**
 * FullStrategy를 간단한 Strategy로 변환
 */
const convertToRuntimeStrategy = (fullStrategy: FullStrategy): Strategy => {
  // 기본적으로 모의 수익률과 수익금액을 생성
  // 실제로는 백테스팅 결과나 실시간 거래 데이터에서 가져와야 함
  const mockProfitRate = (Math.random() - 0.5) * 20; // -10% ~ +10%
  const mockProfitAmount = mockProfitRate * 10000; // 가상의 투자금 기준

  return {
    id: fullStrategy.id,
    name: fullStrategy.name,
    status: fullStrategy.isActive ? 'active' : 'stopped',
    profitRate: mockProfitRate,
    profitAmount: mockProfitAmount,
    startDate: fullStrategy.createdAt,
    lastUpdated: fullStrategy.updatedAt
  };
};

/**
 * 실시간 데이터 구독 훅
 */
export const useRealTimeData = () => {
  const [data, setData] = useState<RealTimeData>({
    accountInfo: null,
    strategies: [],
    recentTrades: [],
    isLoading: true,
    error: null,
    lastUpdated: 0
  });

  useEffect(() => {
    const unsubscribeFunctions: (() => void)[] = [];

    const initializeDataSubscription = async () => {
      try {
        const user = firebaseService.getCurrentUser();
        if (!user) {
          setData(prev => ({
            ...prev,
            isLoading: false,
            error: '사용자 인증이 필요합니다.'
          }));
          return;
        }

        // 모의 계좌 정보
        const mockAccountInfo: AccountInfo = {
          totalAssets: 10000000,
          availableCash: 3000000,
          profitRate: 5.2,
          profitAmount: 520000,
          lastUpdated: Date.now()
        };

        // 실제 전략 데이터 로드
        const strategyService = StrategyService.getInstance();
        const fullStrategies = await strategyService.getStrategies();
        const runtimeStrategies = fullStrategies.map(convertToRuntimeStrategy);

        // 모의 매매 내역
        const mockTrades: TradeRecord[] = [
          {
            id: 'trade-1',
            symbol: '005930',
            type: 'buy',
            quantity: 10,
            price: 75000,
            amount: 750000,
            timestamp: Date.now() - 60 * 60 * 1000,
            strategyId: runtimeStrategies[0]?.id
          },
          {
            id: 'trade-2',
            symbol: '000660',
            type: 'sell',
            quantity: 5,
            price: 120000,
            amount: 600000,
            timestamp: Date.now() - 2 * 60 * 60 * 1000,
            strategyId: runtimeStrategies[0]?.id
          }
        ];

        setData({
          accountInfo: mockAccountInfo,
          strategies: runtimeStrategies,
          recentTrades: mockTrades,
          isLoading: false,
          error: null,
          lastUpdated: Date.now()
        });

        // 실시간 업데이트 시뮬레이션 (5초마다)
        const updateInterval = setInterval(async () => {
          // 전략 데이터 다시 로드 (새로 생성된 전략 반영)
          const updatedFullStrategies = await strategyService.getStrategies();
          const updatedRuntimeStrategies = updatedFullStrategies.map(convertToRuntimeStrategy);

          setData(prev => ({
            ...prev,
            accountInfo: prev.accountInfo ? {
              ...prev.accountInfo,
              profitRate: prev.accountInfo.profitRate + (Math.random() - 0.5) * 0.1,
              profitAmount: prev.accountInfo.profitAmount + (Math.random() - 0.5) * 1000,
              lastUpdated: Date.now()
            } : null,
            strategies: updatedRuntimeStrategies,
            lastUpdated: Date.now()
          }));
        }, 5000);

        unsubscribeFunctions.push(() => clearInterval(updateInterval));

      } catch (error) {
        console.error('실시간 데이터 구독 오류:', error);
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: '데이터를 불러오는 중 오류가 발생했습니다.'
        }));
      }
    };

    initializeDataSubscription();

    // 정리 함수
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // 데이터 새로고침 함수
  const refreshData = async () => {
    setData(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // 실제 전략 데이터 다시 로드
      const strategyService = StrategyService.getInstance();
      const fullStrategies = await strategyService.getStrategies();
      const runtimeStrategies = fullStrategies.map(convertToRuntimeStrategy);
      
      setTimeout(() => {
        setData(prev => ({
          ...prev,
          strategies: runtimeStrategies,
          isLoading: false,
          lastUpdated: Date.now()
        }));
      }, 500);
    } catch (error) {
      console.error('데이터 새로고침 오류:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: '데이터 새로고침 중 오류가 발생했습니다.'
      }));
    }
  };

  return {
    ...data,
    refreshData
  };
}; 