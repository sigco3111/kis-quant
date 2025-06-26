/**
 * 실시간 매매 모니터링 컴포넌트
 * 실시간 포지션, 주문 현황, 손익 차트, 위험 알림 표시
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Flex,
  Spacer,
  SimpleGrid,
  Spinner
} from '@chakra-ui/react';

// 인터페이스 정의
interface Position {
  symbol: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  pnl: number;
  pnl_ratio: number;
}

interface Order {
  order_id: string;
  symbol: string;
  order_type: string;
  side: string;
  quantity: number;
  price: number;
  status: string;
  timestamp: string;
}

interface Trade {
  trade_id: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  timestamp: string;
}

interface PortfolioStats {
  total_invested: number;
  total_market_value: number;
  total_pnl: number;
  total_pnl_ratio: number;
}

interface RiskAlert {
  alert_id: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  is_resolved: boolean;
}

interface TradingMonitorProps {
  isRunning: boolean;
}

const TradingMonitor: React.FC<TradingMonitorProps> = ({ isRunning }) => {
  // 상태 관리
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats>({
    total_invested: 0,
    total_market_value: 0,
    total_pnl: 0,
    total_pnl_ratio: 0
  });
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // 색상 테마
  const bgColor = 'white';
  const borderColor = 'gray.200';
  
  // 손익 색상 계산
  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'green.500';
    if (pnl < 0) return 'red.500';
    return 'gray.500';
  };

  // 데이터 조회 함수
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 포지션 데이터 조회
      const positionsResponse = await fetch('/api/trading/positions');
      if (!positionsResponse.ok) {
        throw new Error('포지션 데이터를 불러올 수 없습니다.');
      }
      const positionsData = await positionsResponse.json();
      setPositions(positionsData);

      // 주문 데이터 조회
      const ordersResponse = await fetch('/api/trading/orders');
      if (!ordersResponse.ok) {
        throw new Error('주문 데이터를 불러올 수 없습니다.');
      }
      const ordersData = await ordersResponse.json();
      setOrders(ordersData);

      // 거래 내역 조회
      const tradesResponse = await fetch('/api/trading/trades');
      if (!tradesResponse.ok) {
        throw new Error('거래 내역을 불러올 수 없습니다.');
      }
      const tradesData = await tradesResponse.json();
      setRecentTrades(tradesData);

      // 포트폴리오 통계 조회
      const statsResponse = await fetch('/api/trading/stats');
      if (!statsResponse.ok) {
        throw new Error('포트폴리오 통계를 불러올 수 없습니다.');
      }
      const statsData = await statsResponse.json();
      setPortfolioStats(statsData);

      // 위험 알림 조회
      const alertsResponse = await fetch('/api/trading/alerts');
      if (!alertsResponse.ok) {
        throw new Error('위험 알림을 불러올 수 없습니다.');
      }
      const alertsData = await alertsResponse.json();
      setRiskAlerts(alertsData);

    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 초기 데이터 로딩 및 자동 새로고침
  useEffect(() => {
    fetchData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh && isRunning) {
      interval = setInterval(fetchData, 5000); // 5초마다 새로고침
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, isRunning]);

  if (isLoading) {
    return (
      <Box p={4} textAlign="center">
        <Spinner size="lg" />
        <Text mt={2}>데이터를 불러오는 중...</Text>
      </Box>
    );
  }

  return (
    <Box p={4} maxWidth="1200px" mx="auto">
      <VStack gap={6} align="stretch">
        {/* 헤더 */}
        <Flex justify="space-between" align="center">
          <Text fontSize="2xl" fontWeight="bold">
            📊 매매 모니터링
          </Text>
          <Badge colorScheme={isRunning ? 'green' : 'red'}>
            {isRunning ? '🟢 실행 중' : '🔴 정지'}
          </Badge>
        </Flex>

        {/* 에러 표시 */}
        {error && (
          <Box bg="red.50" border="1px" borderColor="red.200" p={4} borderRadius="md">
            <Text color="red.600" fontWeight="bold">⚠️ 오류 발생</Text>
            <Text color="red.500">{error}</Text>
          </Box>
        )}

        {/* 제어 패널 */}
        <Box bg={bgColor} border="1px" borderColor={borderColor} p={4} borderRadius="md">
          <Flex justify="space-between" align="center">
            <Text fontSize="lg" fontWeight="bold">
              제어 패널
            </Text>
            <HStack>
              <Button
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                colorScheme={autoRefresh ? 'blue' : 'gray'}
              >
                {autoRefresh ? '자동 새로고침 켜짐' : '자동 새로고침 꺼짐'}
              </Button>
              <Button size="sm" onClick={fetchData}>
                수동 새로고침
              </Button>
            </HStack>
          </Flex>
        </Box>

        {/* 포트폴리오 요약 */}
        <Box bg={bgColor} border="1px" borderColor={borderColor} p={4} borderRadius="md">
          <Text fontSize="lg" fontWeight="bold" mb={4}>
            💰 포트폴리오 요약
          </Text>
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
            <Box>
              <Text fontSize="sm" color="gray.500">총 투자금액</Text>
              <Text fontSize="lg" fontWeight="bold">
                {(portfolioStats.total_invested || 0).toLocaleString()}원
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.500">시가총액</Text>
              <Text fontSize="lg" fontWeight="bold">
                {(portfolioStats.total_market_value || 0).toLocaleString()}원
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.500">총 손익</Text>
              <Text fontSize="lg" fontWeight="bold" color={getPnLColor(portfolioStats.total_pnl || 0)}>
                {portfolioStats.total_pnl >= 0 ? '↗️' : '↘️'} {(portfolioStats.total_pnl || 0).toLocaleString()}원
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.500">보유 종목</Text>
              <Text fontSize="lg" fontWeight="bold">
                {positions.length}개
              </Text>
            </Box>
          </SimpleGrid>
        </Box>

        {/* 위험 알림 */}
        {riskAlerts.filter(alert => !alert.is_resolved).length > 0 && (
          <Box bg="red.50" border="1px" borderColor="red.200" p={4} borderRadius="md">
            <Text fontSize="lg" fontWeight="bold" color="red.600" mb={2}>
              🚨 위험 알림
            </Text>
            <VStack align="stretch" gap={2}>
              {riskAlerts
                .filter(alert => !alert.is_resolved)
                .map(alert => (
                  <Box key={alert.alert_id} bg="white" p={3} borderRadius="md" border="1px" borderColor="red.300">
                    <Flex justify="space-between" align="center">
                      <Text color="red.600" fontWeight="bold">
                        {alert.risk_level === 'critical' ? '🔴 심각' : '🟡 경고'}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </Text>
                    </Flex>
                    <Text mt={1}>{alert.message}</Text>
                  </Box>
                ))}
            </VStack>
          </Box>
        )}

        {/* 현재 포지션 */}
        <Box bg={bgColor} border="1px" borderColor={borderColor} p={4} borderRadius="md">
          <Text fontSize="lg" fontWeight="bold" mb={4}>
            📈 현재 포지션
          </Text>
          {positions.length > 0 ? (
            <VStack align="stretch" gap={2}>
              {positions.map((position, index) => (
                <Box key={index} bg="gray.50" p={3} borderRadius="md">
                  <Flex justify="space-between" align="center">
                                      <VStack align="start" gap={0}>
                    <Text fontWeight="bold">{position.symbol}</Text>
                    <Text fontSize="sm" color="gray.500">
                      {position.quantity.toLocaleString()}주 @ {position.avg_price.toLocaleString()}원
                    </Text>
                  </VStack>
                  <VStack align="end" gap={0}>
                      <Text fontWeight="bold" color={getPnLColor(position.pnl)}>
                        {position.pnl.toLocaleString()}원
                      </Text>
                      <Text fontSize="sm" color={getPnLColor(position.pnl)}>
                        ({position.pnl_ratio > 0 ? '+' : ''}{position.pnl_ratio.toFixed(2)}%)
                      </Text>
                    </VStack>
                  </Flex>
                </Box>
              ))}
            </VStack>
          ) : (
            <Text color="gray.500">보유 중인 포지션이 없습니다.</Text>
          )}
        </Box>

        {/* 진행 중 주문 */}
        <Box bg={bgColor} border="1px" borderColor={borderColor} p={4} borderRadius="md">
          <Text fontSize="lg" fontWeight="bold" mb={4}>
            ⏱️ 진행 중 주문
          </Text>
          {orders.length > 0 ? (
            <VStack align="stretch" gap={2}>
              {orders.map((order) => (
                <Box key={order.order_id} bg="gray.50" p={3} borderRadius="md">
                  <Flex justify="space-between" align="center">
                    <VStack align="start" gap={0}>
                      <Text fontWeight="bold">{order.symbol}</Text>
                      <Text fontSize="sm" color="gray.500">
                        {order.side === 'buy' ? '매수' : '매도'} {order.quantity.toLocaleString()}주 @ {order.price.toLocaleString()}원
                      </Text>
                    </VStack>
                    <VStack align="end" gap={0}>
                      <Badge colorScheme={order.status === 'filled' ? 'green' : 'yellow'}>
                        {order.status}
                      </Badge>
                      <Text fontSize="sm" color="gray.500">
                        {new Date(order.timestamp).toLocaleString()}
                      </Text>
                    </VStack>
                  </Flex>
                </Box>
              ))}
            </VStack>
          ) : (
            <Text color="gray.500">진행 중인 주문이 없습니다.</Text>
          )}
        </Box>

        {/* 최근 거래 내역 */}
        <Box bg={bgColor} border="1px" borderColor={borderColor} p={4} borderRadius="md">
          <Text fontSize="lg" fontWeight="bold" mb={4}>
            📋 최근 거래 내역
          </Text>
          {recentTrades.length > 0 ? (
            <VStack align="stretch" gap={2}>
              {recentTrades.slice(0, 10).map((trade) => (
                <Box key={trade.trade_id} bg="gray.50" p={3} borderRadius="md">
                  <Flex justify="space-between" align="center">
                    <VStack align="start" gap={0}>
                      <Text fontWeight="bold">{trade.symbol}</Text>
                      <Text fontSize="sm" color="gray.500">
                        {trade.side === 'buy' ? '매수' : '매도'} {trade.quantity.toLocaleString()}주
                      </Text>
                    </VStack>
                    <VStack align="end" gap={0}>
                      <Text fontWeight="bold">
                        {trade.price.toLocaleString()}원
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {new Date(trade.timestamp).toLocaleString()}
                      </Text>
                    </VStack>
                  </Flex>
                </Box>
              ))}
            </VStack>
          ) : (
            <Text color="gray.500">최근 거래 내역이 없습니다.</Text>
          )}
        </Box>
      </VStack>
    </Box>
  );
};

export default TradingMonitor; 