/**
 * 매매 제어 인터페이스
 * 자동매매 시작/중지/일시정지, 긴급 정지 버튼, 실시간 상태 표시
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  Text,
  Badge,
  VStack,
  HStack,
  SimpleGrid,
  Spinner
} from '@chakra-ui/react';
import { Strategy } from '../types/Strategy';

// 매매 상태 타입
type TradingStatus = 'stopped' | 'active' | 'paused' | 'error';

interface TradingBotStatus {
  status: TradingStatus;
  positions_count: number;
  active_orders_count: number;
  total_trades: number;
  last_update: string;
}

interface TradingControlProps {
  strategy: Strategy;
  onStatusChange?: (status: TradingStatus) => void;
  onClose?: () => void;
}

export const TradingControl: React.FC<TradingControlProps> = ({ 
  strategy, 
  onStatusChange,
  onClose 
}) => {
  const [botStatus, setBotStatus] = useState<TradingBotStatus>({
    status: 'stopped',
    positions_count: 0,
    active_orders_count: 0,
    total_trades: 0,
    last_update: new Date().toISOString()
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false); // 목 모드 상태

  /**
   * 목 데이터로 봇 상태 생성
   */
  const generateMockBotStatus = (status: TradingStatus): TradingBotStatus => {
    const baseStatus = {
      status,
      last_update: new Date().toISOString()
    };

    switch (status) {
      case 'active':
        return {
          ...baseStatus,
          positions_count: Math.floor(Math.random() * 5) + 1,
          active_orders_count: Math.floor(Math.random() * 3),
          total_trades: Math.floor(Math.random() * 50) + 10
        };
      case 'paused':
        return {
          ...baseStatus,
          positions_count: Math.floor(Math.random() * 3) + 1,
          active_orders_count: 0,
          total_trades: Math.floor(Math.random() * 30) + 5
        };
      case 'stopped':
      default:
        return {
          ...baseStatus,
          positions_count: 0,
          active_orders_count: 0,
          total_trades: Math.floor(Math.random() * 20)
        };
    }
  };

  /**
   * 컴포넌트 마운트 시 상태 조회 및 실시간 업데이트 시작
   */
  useEffect(() => {
    fetchBotStatus();
    
    let intervalId: NodeJS.Timeout;
    if (autoRefresh) {
      intervalId = setInterval(fetchBotStatus, 5000); // 5초마다 상태 갱신
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [strategy.id, autoRefresh]);

  /**
   * 봇 상태 조회 (목 모드 지원)
   */
  const fetchBotStatus = async () => {
    try {
      const response = await fetch(`/api/trading/status/${strategy.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('API 서버에 연결할 수 없습니다.');
      }

      const data = await response.json();
      setBotStatus(data);
      setError(null);
      setIsMockMode(false);
      
      // 상태 변경 콜백 호출
      if (onStatusChange) {
        onStatusChange(data.status);
      }
      
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('API 호출 실패, 목 모드로 전환:', err);
      
      // 목 모드로 전환
      setIsMockMode(true);
      setError(null);
      
      // 현재 상태 유지 또는 기본값 설정
      if (!botStatus.status || botStatus.status === 'stopped') {
        const mockStatus = generateMockBotStatus('stopped');
        setBotStatus(mockStatus);
        
        if (onStatusChange) {
          onStatusChange(mockStatus.status);
        }
      }
    }
  };

  /**
   * 자동매매 시작 (목 모드 지원)
   */
  const handleStartTrading = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/trading/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strategy_id: strategy.id,
          user_id: 'current_user' // TODO: 실제 사용자 ID로 교체
        }),
      });

      if (!response.ok) {
        throw new Error('API 서버에 연결할 수 없습니다.');
      }

      await fetchBotStatus();
      alert(`자동매매 시작: ${strategy.name} 전략이 시작되었습니다.`);
      
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('API 호출 실패, 목 모드로 동작:', err);
      
      // 목 모드로 동작
      setIsMockMode(true);
      const mockStatus = generateMockBotStatus('active');
      setBotStatus(mockStatus);
      
      if (onStatusChange) {
        onStatusChange(mockStatus.status);
      }
      
      alert(`🎯 목 모드: ${strategy.name} 전략이 시작되었습니다. (시뮬레이션)`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 자동매매 중지 (목 모드 지원)
   */
  const handleStopTrading = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/trading/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strategy_id: strategy.id,
          user_id: 'current_user' // TODO: 실제 사용자 ID로 교체
        }),
      });

      if (!response.ok) {
        throw new Error('API 서버에 연결할 수 없습니다.');
      }

      await fetchBotStatus();
      alert(`자동매매 중지: ${strategy.name} 전략이 중지되었습니다.`);
      
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('API 호출 실패, 목 모드로 동작:', err);
      
      // 목 모드로 동작
      setIsMockMode(true);
      const mockStatus = generateMockBotStatus('stopped');
      setBotStatus(mockStatus);
      
      if (onStatusChange) {
        onStatusChange(mockStatus.status);
      }
      
      alert(`🎯 목 모드: ${strategy.name} 전략이 중지되었습니다. (시뮬레이션)`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 자동매매 일시정지 (목 모드 지원)
   */
  const handlePauseTrading = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/trading/pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strategy_id: strategy.id,
          user_id: 'current_user' // TODO: 실제 사용자 ID로 교체
        }),
      });

      if (!response.ok) {
        throw new Error('API 서버에 연결할 수 없습니다.');
      }

      await fetchBotStatus();
      alert(`자동매매 일시정지: ${strategy.name} 전략이 일시정지되었습니다.`);
      
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('API 호출 실패, 목 모드로 동작:', err);
      
      // 목 모드로 동작
      setIsMockMode(true);
      const mockStatus = generateMockBotStatus('paused');
      setBotStatus(mockStatus);
      
      if (onStatusChange) {
        onStatusChange(mockStatus.status);
      }
      
      alert(`🎯 목 모드: ${strategy.name} 전략이 일시정지되었습니다. (시뮬레이션)`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 자동매매 재개 (목 모드 지원)
   */
  const handleResumeTrading = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/trading/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strategy_id: strategy.id,
          user_id: 'current_user' // TODO: 실제 사용자 ID로 교체
        }),
      });

      if (!response.ok) {
        throw new Error('API 서버에 연결할 수 없습니다.');
      }

      await fetchBotStatus();
      alert(`자동매매 재개: ${strategy.name} 전략이 재개되었습니다.`);
      
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('API 호출 실패, 목 모드로 동작:', err);
      
      // 목 모드로 동작
      setIsMockMode(true);
      const mockStatus = generateMockBotStatus('active');
      setBotStatus(mockStatus);
      
      if (onStatusChange) {
        onStatusChange(mockStatus.status);
      }
      
      alert(`🎯 목 모드: ${strategy.name} 전략이 재개되었습니다. (시뮬레이션)`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 긴급 정지 (목 모드 지원)
   */
  const handleEmergencyStop = async () => {
    if (!window.confirm('⚠️ 긴급 정지하시겠습니까? 모든 포지션이 즉시 정리됩니다.')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/trading/emergency-stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strategy_id: strategy.id,
          user_id: 'current_user' // TODO: 실제 사용자 ID로 교체
        }),
      });

      if (!response.ok) {
        throw new Error('API 서버에 연결할 수 없습니다.');
      }

      await fetchBotStatus();
      alert('🚨 긴급 정지 완료: 모든 거래가 중지되었습니다.');
      
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('API 호출 실패, 목 모드로 동작:', err);
      
      // 목 모드로 동작
      setIsMockMode(true);
      const mockStatus = generateMockBotStatus('stopped');
      setBotStatus(mockStatus);
      
      if (onStatusChange) {
        onStatusChange(mockStatus.status);
      }
      
      alert('🚨 목 모드: 긴급 정지 완료. 모든 거래가 중지되었습니다. (시뮬레이션)');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 상태에 따른 색상 반환
   */
  const getStatusColor = (status: TradingStatus): string => {
    switch (status) {
      case 'active': return 'green';
      case 'paused': return 'yellow';
      case 'error': return 'red';
      case 'stopped':
      default:
        return 'gray';
    }
  };

  /**
   * 상태 텍스트 반환
   */
  const getStatusText = (status: TradingStatus): string => {
    switch (status) {
      case 'active': return '🟢 실행 중';
      case 'paused': return '🟡 일시정지';
      case 'error': return '🔴 오류';
      case 'stopped':
      default:
        return '⚫ 중지';
    }
  };

  if (isLoading && !botStatus) {
    return (
      <Box p={4} textAlign="center">
        <Spinner size="lg" />
        <Text mt={2}>상태를 확인하는 중...</Text>
      </Box>
    );
  }

  return (
    <Box p={4} maxWidth="800px" mx="auto">
      <VStack gap={6} align="stretch">
        {/* 헤더 */}
        <Flex justify="space-between" align="center">
          <HStack gap={4}>
            {onClose && (
              <Button
                size="sm"
                variant="outline"
                onClick={onClose}
              >
                ← 뒤로
              </Button>
            )}
            <Text fontSize="2xl" fontWeight="bold">
              🎯 매매 제어판
            </Text>
          </HStack>
          <Badge colorScheme={getStatusColor(botStatus.status)} fontSize="md" p={2}>
            {getStatusText(botStatus.status)}
          </Badge>
        </Flex>

        {/* 에러 표시 */}
        {error && (
          <Box bg="red.50" border="1px" borderColor="red.200" p={4} borderRadius="md">
            <Text color="red.600" fontWeight="bold">⚠️ 오류 발생</Text>
            <Text color="red.500">{error}</Text>
          </Box>
        )}

        {/* 전략 정보 */}
        <Box bg="gray.50" p={4} borderRadius="md">
          <Text fontSize="lg" fontWeight="bold" mb={2}>
            📊 전략: {strategy.name}
          </Text>
          <Text color="gray.600" mb={2}>
            {strategy.description}
          </Text>
          <Text fontSize="sm" color="gray.500">
            마지막 업데이트: {new Date(botStatus.last_update).toLocaleString()}
          </Text>
          {isMockMode && (
            <Box mt={2} p={2} bg="blue.100" borderRadius="md" border="1px solid #3182CE">
              <Text fontSize="sm" color="blue.700" fontWeight="bold">
                🎯 목 모드: 백엔드 서버가 연결되지 않아 시뮬레이션으로 동작 중입니다.
              </Text>
            </Box>
          )}
        </Box>

        {/* 통계 */}
        <Box bg="white" border="1px" borderColor="gray.200" p={4} borderRadius="md">
          <Text fontSize="lg" fontWeight="bold" mb={4}>
            📈 현재 상태
          </Text>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            <Box textAlign="center">
              <Text fontSize="sm" color="gray.500">보유 포지션</Text>
              <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                {botStatus.positions_count}
              </Text>
              <Text fontSize="xs" color="gray.400">개</Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="sm" color="gray.500">진행 중 주문</Text>
              <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                {botStatus.active_orders_count}
              </Text>
              <Text fontSize="xs" color="gray.400">건</Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="sm" color="gray.500">총 거래 수</Text>
              <Text fontSize="2xl" fontWeight="bold" color="green.500">
                {botStatus.total_trades}
              </Text>
              <Text fontSize="xs" color="gray.400">회</Text>
            </Box>
          </SimpleGrid>
        </Box>

        {/* 제어 버튼 */}
        <Box bg="white" border="1px" borderColor="gray.200" p={4} borderRadius="md">
          <Text fontSize="lg" fontWeight="bold" mb={4}>
            🎛️ 제어
          </Text>
          <VStack gap={4}>
            {/* 기본 제어 */}
            <HStack justify="center" gap={4} width="100%">
              {botStatus.status === 'stopped' && (
                                  <Button
                    colorScheme="green"
                    size="lg"
                    onClick={handleStartTrading}
                    loading={isLoading}
                    flex={1}
                  >
                    🚀 시작
                  </Button>
              )}
              
              {botStatus.status === 'active' && (
                <>
                                      <Button
                      colorScheme="yellow"
                      size="lg"
                      onClick={handlePauseTrading}
                      loading={isLoading}
                      flex={1}
                    >
                      ⏸️ 일시정지
                    </Button>
                    <Button
                      colorScheme="gray"
                      size="lg"
                      onClick={handleStopTrading}
                      loading={isLoading}
                      flex={1}
                    >
                      ⏹️ 중지
                    </Button>
                </>
              )}
              
              {botStatus.status === 'paused' && (
                <>
                                      <Button
                      colorScheme="green"
                      size="lg"
                      onClick={handleResumeTrading}
                      loading={isLoading}
                      flex={1}
                    >
                      ▶️ 재개
                    </Button>
                    <Button
                      colorScheme="gray"
                      size="lg"
                      onClick={handleStopTrading}
                      loading={isLoading}
                      flex={1}
                    >
                      ⏹️ 중지
                    </Button>
                </>
              )}
            </HStack>
            
            {/* 긴급 정지 */}
                          <Button
                colorScheme="red"
                size="lg"
                onClick={handleEmergencyStop}
                loading={isLoading}
                width="100%"
                variant="outline"
              >
                🚨 긴급 정지
              </Button>
          </VStack>
        </Box>

        {/* 설정 */}
        <Box bg="white" border="1px" borderColor="gray.200" p={4} borderRadius="md">
          <Text fontSize="lg" fontWeight="bold" mb={4}>
            ⚙️ 설정
          </Text>
          <Flex justify="space-between" align="center">
            <Text>자동 새로고침</Text>
            <Button
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              colorScheme={autoRefresh ? 'blue' : 'gray'}
              variant={autoRefresh ? 'solid' : 'outline'}
            >
              {autoRefresh ? '켜짐' : '꺼짐'}
            </Button>
          </Flex>
        </Box>
      </VStack>
    </Box>
  );
};

export default TradingControl; 