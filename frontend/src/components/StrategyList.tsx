/**
 * 전략 목록 컴포넌트
 * 실행 중인 전략들을 테이블 형태로 표시합니다.
 */

import React from 'react';
import {
  Box,
  Text,
  Badge,
  Spinner,
  Flex
} from '@chakra-ui/react';
import { Strategy } from '../hooks/useRealTimeData';

interface StrategyListProps {
  strategies: Strategy[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

/**
 * 수익률을 퍼센트 형식으로 포맷팅
 */
const formatPercentage = (rate: number): string => {
  return `${rate >= 0 ? '+' : ''}${rate.toFixed(2)}%`;
};

/**
 * 금액을 한국 원화 형식으로 포맷팅
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * 날짜를 상대적 시간으로 포맷팅
 */
const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  
  if (days === 0) {
    return '오늘';
  } else if (days === 1) {
    return '어제';
  } else {
    return `${days}일 전`;
  }
};

/**
 * 전략 상태에 따른 배지 스타일 반환
 */
const getStatusBadge = (status: Strategy['status']) => {
  switch (status) {
    case 'active':
      return { colorScheme: 'green', text: '실행중' };
    case 'paused':
      return { colorScheme: 'yellow', text: '일시정지' };
    case 'stopped':
      return { colorScheme: 'red', text: '중단됨' };
    default:
      return { colorScheme: 'gray', text: '알 수 없음' };
  }
};

/**
 * 전략 목록 컴포넌트
 */
export const StrategyList: React.FC<StrategyListProps> = ({
  strategies,
  isLoading,
  error,
  lastUpdated
}) => {
  // 로딩 상태
  if (isLoading) {
    return (
      <Box>
        <Text fontSize="lg" fontWeight="bold" mb={4} color="gray.700">
          🚀 실행 중인 전략
        </Text>
        <Box p={8} bg="white" borderRadius="lg" shadow="sm" border="1px" borderColor="gray.200">
          <Flex justify="center" align="center">
            <Spinner size="lg" color="blue.500" />
          </Flex>
        </Box>
      </Box>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <Box>
        <Text fontSize="lg" fontWeight="bold" mb={4} color="gray.700">
          🚀 실행 중인 전략
        </Text>
        <Box p={4} bg="red.50" borderRadius="md" borderLeft="4px" borderColor="red.400">
          <Text color="red.800" fontSize="sm">
            <strong>데이터 로드 오류:</strong> {error}
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="lg" fontWeight="bold" color="gray.700">
          🚀 실행 중인 전략
        </Text>
        <Text fontSize="xs" color="gray.500">
          총 {strategies.length}개 전략
        </Text>
      </Flex>

      <Box bg="white" borderRadius="lg" shadow="sm" border="1px" borderColor="gray.200" overflow="hidden">
        {strategies.length === 0 ? (
          // 전략이 없는 경우
          <Box p={8} textAlign="center">
            <Text color="gray.500" fontSize="md">
              🔍 실행 중인 전략이 없습니다.
            </Text>
            <Text color="gray.400" fontSize="sm" mt={2}>
              새로운 전략을 생성하여 자동매매를 시작해보세요.
            </Text>
          </Box>
        ) : (
          // 전략 목록을 카드 형태로 표시 (모바일 친화적)
          <Box p={4}>
            {strategies.map((strategy, index) => {
              const statusBadge = getStatusBadge(strategy.status);
              return (
                <Box 
                  key={strategy.id} 
                  p={4} 
                  mb={index < strategies.length - 1 ? 4 : 0}
                  bg="gray.50" 
                  borderRadius="md"
                  border="1px"
                  borderColor="gray.200"
                  _hover={{ bg: 'gray.100' }}
                >
                  <Flex justify="space-between" align="start" mb={3}>
                    <Box>
                      <Text fontWeight="bold" color="gray.800" fontSize="md">
                        {strategy.name}
                      </Text>
                      <Text color="gray.600" fontSize="sm" mt={1}>
                        시작일: {formatRelativeTime(strategy.startDate)}
                      </Text>
                    </Box>
                    <Badge colorScheme={statusBadge.colorScheme} variant="subtle">
                      {statusBadge.text}
                    </Badge>
                  </Flex>
                  
                  <Flex justify="space-between" align="center">
                    <Box>
                      <Text fontSize="xs" color="gray.500" mb={1}>수익률</Text>
                      <Text 
                        color={strategy.profitRate >= 0 ? 'red.600' : 'blue.600'}
                        fontWeight="bold"
                        fontSize="lg"
                      >
                        {formatPercentage(strategy.profitRate)}
                      </Text>
                    </Box>
                    <Box textAlign="right">
                      <Text fontSize="xs" color="gray.500" mb={1}>수익금액</Text>
                      <Text 
                        color={strategy.profitAmount >= 0 ? 'red.600' : 'blue.600'}
                        fontWeight="semibold"
                        fontSize="md"
                      >
                        {formatCurrency(strategy.profitAmount)}
                      </Text>
                    </Box>
                  </Flex>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}; 