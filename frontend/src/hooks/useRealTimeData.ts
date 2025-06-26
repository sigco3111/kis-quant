/**
 * 실시간 데이터 구독 훅
 * Firebase Realtime Database에서 사용자 데이터를 실시간으로 구독합니다.
 */

import { useState, useEffect } from 'react';
import { firebaseService } from '../services/FirebaseService';

// 계좌 정보 인터페이스
export interface AccountInfo {
  totalAssets: number;
  availableCash: number;
  profitRate: number;
  profitAmount: number;
  lastUpdated: number;
}

// 전략 정보 인터페이스
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

        // Firebase Realtime Database 참조 (실제로는 localStorage에서 데이터 조회)
        // 현재는 localStorage 기반 시스템이므로 모의 데이터로 대체
        
        // 모의 계좌 정보
        const mockAccountInfo: AccountInfo = {
          totalAssets: 10000000,
          availableCash: 3000000,
          profitRate: 5.2,
          profitAmount: 520000,
          lastUpdated: Date.now()
        };

        // 모의 전략 데이터
        const mockStrategies: Strategy[] = [
          {
            id: 'strategy-1',
            name: '모멘텀 전략',
            status: 'active',
            profitRate: 8.5,
            profitAmount: 425000,
            startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
            lastUpdated: Date.now()
          },
          {
            id: 'strategy-2',
            name: '평균회귀 전략',
            status: 'paused',
            profitRate: 2.1,
            profitAmount: 105000,
            startDate: Date.now() - 15 * 24 * 60 * 60 * 1000,
            lastUpdated: Date.now()
          }
        ];

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
            strategyId: 'strategy-1'
          },
          {
            id: 'trade-2',
            symbol: '000660',
            type: 'sell',
            quantity: 5,
            price: 120000,
            amount: 600000,
            timestamp: Date.now() - 2 * 60 * 60 * 1000,
            strategyId: 'strategy-1'
          }
        ];

        setData({
          accountInfo: mockAccountInfo,
          strategies: mockStrategies,
          recentTrades: mockTrades,
          isLoading: false,
          error: null,
          lastUpdated: Date.now()
        });

        // 실시간 업데이트 시뮬레이션 (1초마다)
        const updateInterval = setInterval(() => {
          setData(prev => ({
            ...prev,
            accountInfo: prev.accountInfo ? {
              ...prev.accountInfo,
              profitRate: prev.accountInfo.profitRate + (Math.random() - 0.5) * 0.1,
              profitAmount: prev.accountInfo.profitAmount + (Math.random() - 0.5) * 1000,
              lastUpdated: Date.now()
            } : null,
            lastUpdated: Date.now()
          }));
        }, 1000);

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
  const refreshData = () => {
    setData(prev => ({ ...prev, isLoading: true, error: null }));
    // 실제로는 Firebase에서 데이터를 다시 가져오는 로직이 들어갑니다.
    setTimeout(() => {
      setData(prev => ({
        ...prev,
        isLoading: false,
        lastUpdated: Date.now()
      }));
    }, 1000);
  };

  return {
    ...data,
    refreshData
  };
}; 