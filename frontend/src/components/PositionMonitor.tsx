/**
 * 포지션 현황 실시간 모니터링 컴포넌트
 * 현재 보유 포지션의 실시간 수익률, 가격 변동을 모니터링합니다.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  SimpleGrid,
  Spinner
} from '@chakra-ui/react';
import { notificationService } from '../services/NotificationService';

// 포지션 정보 인터페이스
interface Position {
  id: string;
  symbol: string;
  symbolName: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLRate: number;
  lastUpdate: number;
}

// 포지션 요약 정보
interface PositionSummary {
  totalValue: number;
  totalPnL: number;
  totalPnLRate: number;
  positionCount: number;
  topGainer: Position | null;
  topLoser: Position | null;
}

interface PositionMonitorProps {
  userId?: string;
  refreshInterval?: number; // 새로고침 간격 (밀리초)
}

export const PositionMonitor: React.FC<PositionMonitorProps> = ({
  userId,
  refreshInterval = 1000 // 기본 1초
}) => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<PositionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');

  /**
   * 목 포지션 데이터 생성
   */
  const generateMockPositions = useCallback((): Position[] => {
    const mockSymbols = [
      { code: '005930', name: '삼성전자' },
      { code: '000660', name: 'SK하이닉스' },
      { code: '035420', name: 'NAVER' },
      { code: '051910', name: 'LG화학' },
      { code: '006400', name: '삼성SDI' }
    ];

    return mockSymbols.map((symbol, index) => {
      const avgPrice = 50000 + Math.random() * 100000;
      const priceChange = (Math.random() - 0.5) * 10; // -5% ~ +5% 변동
      const currentPrice = avgPrice * (1 + priceChange / 100);
      const quantity = Math.floor(Math.random() * 100) + 10;
      const marketValue = currentPrice * quantity;
      const unrealizedPnL = (currentPrice - avgPrice) * quantity;
      const unrealizedPnLRate = ((currentPrice - avgPrice) / avgPrice) * 100;

      return {
        id: `position_${index + 1}`,
        symbol: symbol.code,
        symbolName: symbol.name,
        quantity,
        avgPrice,
        currentPrice,
        marketValue,
        unrealizedPnL,
        unrealizedPnLRate,
        lastUpdate: Date.now()
      };
    });
  }, []);

  /**
   * 포지션 요약 계산
   */
  const calculateSummary = useCallback((positions: Position[]): PositionSummary => {
    if (positions.length === 0) {
      return {
        totalValue: 0,
        totalPnL: 0,
        totalPnLRate: 0,
        positionCount: 0,
        topGainer: null,
        topLoser: null
      };
    }

    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
    const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
    const totalPnLRate = (totalPnL / (totalValue - totalPnL)) * 100;

    // 최고 수익/손실 포지션 찾기
    const sortedByPnLRate = [...positions].sort((a, b) => b.unrealizedPnLRate - a.unrealizedPnLRate);
    const topGainer = sortedByPnLRate[0];
    const topLoser = sortedByPnLRate[sortedByPnLRate.length - 1];

    return {
      totalValue,
      totalPnL,
      totalPnLRate,
      positionCount: positions.length,
      topGainer,
      topLoser
    };
  }, []);

  /**
   * 포지션 데이터 업데이트
   */
  const updatePositions = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      
      // 실제 환경에서는 Firebase나 API에서 데이터를 가져옴
      // 현재는 목 데이터로 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 100)); // 네트워크 지연 시뮬레이션
      
      const newPositions = generateMockPositions();
      const newSummary = calculateSummary(newPositions);
      
      // 이전 포지션과 비교하여 알림 발송
      if (positions.length > 0) {
        newPositions.forEach((newPos, index) => {
          const oldPos = positions[index];
          if (oldPos) {
            // 5% 이상 변동 시 알림
            const changeRate = Math.abs(newPos.unrealizedPnLRate - oldPos.unrealizedPnLRate);
            if (changeRate >= 5) {
              notificationService.sendAlert('price_alert', {
                symbol: newPos.symbolName,
                changeRate: newPos.unrealizedPnLRate.toFixed(2)
              });
            }
          }
        });
      }
      
      setPositions(newPositions);
      setSummary(newSummary);
      setLastUpdate(Date.now());
      setConnectionStatus('connected');
      setError(null);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '포지션 데이터 로드 실패');
      setConnectionStatus('disconnected');
      
      // 서버 연결 오류 알림
      notificationService.sendAlert('server_down', {
        error: err instanceof Error ? err.message : '알 수 없는 오류'
      });
    } finally {
      setIsLoading(false);
    }
  }, [positions, generateMockPositions, calculateSummary]);

  /**
   * 실시간 업데이트 설정
   */
  useEffect(() => {
    // 초기 로드
    updatePositions();

    // 주기적 업데이트
    const interval = setInterval(updatePositions, refreshInterval);

    return () => clearInterval(interval);
  }, [updatePositions, refreshInterval]);

  /**
   * 금액 포맷팅
   */
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(amount);
  };

  /**
   * 퍼센트 포맷팅
   */
  const formatPercentage = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  /**
   * 수익률에 따른 색상 반환
   */
  const getPnLColor = (value: number): string => {
    if (value > 0) return '#48BB78'; // 녹색
    if (value < 0) return '#E53E3E'; // 빨간색
    return '#718096'; // 회색
  };

  /**
   * 연결 상태 표시
   */
  const renderConnectionStatus = () => {
    const statusConfig = {
      connected: { color: 'green', text: '실시간 연결됨' },
      disconnected: { color: 'red', text: '연결 끊김' },
      connecting: { color: 'yellow', text: '연결 중...' }
    };

    const config = statusConfig[connectionStatus];
    
    return (
      <HStack gap={2}>
        <Box
          width="8px"
          height="8px"
          borderRadius="50%"
          backgroundColor={config.color}
          animation={connectionStatus === 'connecting' ? 'pulse 1s infinite' : undefined}
        />
        <Text fontSize="sm" color="gray.600">
          {config.text}
        </Text>
        {lastUpdate > 0 && (
          <Text fontSize="xs" color="gray.500">
            (마지막 업데이트: {new Date(lastUpdate).toLocaleTimeString()})
          </Text>
        )}
      </HStack>
    );
  };

  if (isLoading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" color="blue.500" />
        <Text mt={4} color="gray.600">포지션 데이터 로딩 중...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4} bg="red.50" borderRadius="lg" border="1px solid #E53E3E">
        <HStack gap={3} align="start">
          <Text color="red.500" fontSize="xl">⚠️</Text>
          <VStack align="start" gap={1} flex={1}>
            <Text fontWeight="bold" color="red.700">포지션 로드 실패</Text>
            <Text color="red.600">{error}</Text>
          </VStack>
          <Button size="sm" colorScheme="red" variant="outline" onClick={updatePositions}>
            다시 시도
          </Button>
        </HStack>
      </Box>
    );
  }

  return (
    <VStack gap={6} align="stretch">
      {/* 헤더 */}
      <HStack justify="space-between" align="center">
        <Text fontSize="xl" fontWeight="bold">📊 포지션 현황</Text>
        {renderConnectionStatus()}
      </HStack>

      {/* 포지션 요약 */}
      {summary && (
        <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
          <Box p={4} bg="white" borderRadius="lg" border="1px solid #E2E8F0">
            <Text fontSize="sm" color="gray.600">총 평가금액</Text>
            <Text fontSize="lg" fontWeight="bold">
              {formatCurrency(summary.totalValue)}
            </Text>
          </Box>
          
          <Box p={4} bg="white" borderRadius="lg" border="1px solid #E2E8F0">
            <Text fontSize="sm" color="gray.600">평가손익</Text>
            <Text fontSize="lg" fontWeight="bold" color={getPnLColor(summary.totalPnL)}>
              {formatCurrency(summary.totalPnL)}
            </Text>
            <Text fontSize="sm" color={getPnLColor(summary.totalPnLRate)}>
              {formatPercentage(summary.totalPnLRate)}
            </Text>
          </Box>
          
          <Box p={4} bg="white" borderRadius="lg" border="1px solid #E2E8F0">
            <Text fontSize="sm" color="gray.600">보유 종목</Text>
            <Text fontSize="lg" fontWeight="bold">
              {summary.positionCount}개
            </Text>
          </Box>
          
          <Box p={4} bg="white" borderRadius="lg" border="1px solid #E2E8F0">
            <Text fontSize="sm" color="gray.600">최고 수익률</Text>
            <Text fontSize="lg" fontWeight="bold" color={getPnLColor(summary.topGainer?.unrealizedPnLRate || 0)}>
              {summary.topGainer ? formatPercentage(summary.topGainer.unrealizedPnLRate) : '-'}
            </Text>
            {summary.topGainer && (
              <Text fontSize="xs" color="gray.500">
                {summary.topGainer.symbolName}
              </Text>
            )}
          </Box>
        </SimpleGrid>
      )}

      {/* 개별 포지션 목록 */}
      <VStack gap={3} align="stretch">
        <Text fontSize="lg" fontWeight="600">개별 포지션</Text>
        
        {positions.length === 0 ? (
          <Box textAlign="center" py={8} color="gray.500">
            보유 중인 포지션이 없습니다.
          </Box>
        ) : (
          positions.map((position) => (
            <Box
              key={position.id}
              p={4}
              bg="white"
              borderRadius="lg"
              border="1px solid #E2E8F0"
              _hover={{ bg: 'gray.50' }}
            >
              <HStack justify="space-between" align="center">
                <VStack align="start" gap={1}>
                  <HStack gap={2}>
                    <Text fontWeight="bold">{position.symbolName}</Text>
                    <Badge size="sm" colorScheme="gray">{position.symbol}</Badge>
                  </HStack>
                  <Text fontSize="sm" color="gray.600">
                    {position.quantity.toLocaleString()}주 @ {formatCurrency(position.avgPrice)}
                  </Text>
                </VStack>
                
                <VStack align="end" gap={1}>
                  <Text fontSize="lg" fontWeight="bold">
                    {formatCurrency(position.currentPrice)}
                  </Text>
                  <HStack gap={2}>
                    <Text 
                      fontSize="sm" 
                      fontWeight="600"
                      color={getPnLColor(position.unrealizedPnL)}
                    >
                      {formatCurrency(position.unrealizedPnL)}
                    </Text>
                    <Text 
                      fontSize="sm" 
                      fontWeight="600"
                      color={getPnLColor(position.unrealizedPnLRate)}
                    >
                      {formatPercentage(position.unrealizedPnLRate)}
                    </Text>
                  </HStack>
                </VStack>
              </HStack>
            </Box>
          ))
        )}
      </VStack>
    </VStack>
  );
};

export default PositionMonitor; 