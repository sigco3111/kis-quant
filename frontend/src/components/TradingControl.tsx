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
}

export const TradingControl: React.FC<TradingControlProps> = ({ 
  strategy, 
  onStatusChange 
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
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);

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
   * 봇 상태 조회
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
        throw new Error('상태 조회에 실패했습니다.');
      }

      const data = await response.json();
      setBotStatus(data);
      setError(null);
      
      // 상태 변경 콜백 호출
      if (onStatusChange) {
        onStatusChange(data.status);
      }
      
    } catch (err) {
      console.error('봇 상태 조회 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    }
  };

  /**
   * 자동매매 시작
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
        throw new Error('자동매매 시작에 실패했습니다.');
      }

      await fetchBotStatus();
      alert(`자동매매 시작: ${strategy.name} 전략이 시작되었습니다.`);
      
    } catch (err) {
      console.error('자동매매 시작 오류:', err);
      alert(`시작 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 자동매매 중지
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
        throw new Error('자동매매 중지에 실패했습니다.');
      }

      await fetchBotStatus();
      alert(`자동매매 중지: ${strategy.name} 전략이 중지되었습니다.`);
      
    } catch (err) {
      console.error('자동매매 중지 오류:', err);
      alert(`중지 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 자동매매 일시정지
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
        throw new Error('자동매매 일시정지에 실패했습니다.');
      }

      await fetchBotStatus();
      alert(`자동매매 일시정지: ${strategy.name} 전략이 일시정지되었습니다.`);
      
    } catch (err) {
      console.error('자동매매 일시정지 오류:', err);
      alert(`일시정지 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 자동매매 재개
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
        throw new Error('자동매매 재개에 실패했습니다.');
      }

      await fetchBotStatus();
      alert(`자동매매 재개: ${strategy.name} 전략이 재개되었습니다.`);
      
    } catch (err) {
      console.error('자동매매 재개 오류:', err);
      alert(`재개 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 긴급 정지
   */
  const handleEmergencyStop = async () => {
    if (!window.confirm('긴급 정지하시겠습니까? 모든 매매 활동이 즉시 중단됩니다.')) {
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
        throw new Error('긴급 정지에 실패했습니다.');
      }

      await fetchBotStatus();
      alert('긴급 정지: 모든 매매 활동이 중단되었습니다.');
      
    } catch (err) {
      console.error('긴급 정지 오류:', err);
      alert(`긴급 정지 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
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
          <Text fontSize="2xl" fontWeight="bold">
            🎯 매매 제어판
          </Text>
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