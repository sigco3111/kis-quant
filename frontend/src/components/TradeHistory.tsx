/**
 * 매매 내역 컴포넌트
 * 최근 매매 내역을 시간순으로 표시합니다.
 */

import React from 'react';
import {
  Box,
  Text,
  Badge,
  Spinner,
  Flex,
  VStack
} from '@chakra-ui/react';
import { TradeRecord } from '../hooks/useRealTimeData';

interface TradeHistoryProps {
  trades: TradeRecord[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

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
 * 숫자를 천 단위 구분자로 포맷팅
 */
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('ko-KR').format(num);
};

/**
 * 시간을 상대적 형식으로 포맷팅
 */
const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) {
    return '방금 전';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}분 전`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}시간 전`;
  } else {
    return new Date(timestamp).toLocaleDateString('ko-KR');
  }
};

/**
 * 종목 코드를 종목명으로 변환 (임시 매핑)
 */
const getStockName = (symbol: string): string => {
  const stockNames: { [key: string]: string } = {
    '005930': '삼성전자',
    '000660': 'SK하이닉스',
    '035420': 'NAVER',
    '051910': 'LG화학',
    '006400': '삼성SDI',
    '035720': '카카오',
    '028260': '삼성물산',
    '066570': 'LG전자',
    '105560': 'KB금융',
    '055550': '신한지주'
  };
  
  return stockNames[symbol] || symbol;
};

/**
 * 매매 유형에 따른 배지 스타일 반환
 */
const getTradeBadge = (type: TradeRecord['type']) => {
  switch (type) {
    case 'buy':
      return { colorScheme: 'red', text: '매수', emoji: '🔴' };
    case 'sell':
      return { colorScheme: 'blue', text: '매도', emoji: '🔵' };
    default:
      return { colorScheme: 'gray', text: '알 수 없음', emoji: '⚪' };
  }
};

/**
 * 매매 내역 컴포넌트
 */
export const TradeHistory: React.FC<TradeHistoryProps> = ({
  trades,
  isLoading,
  error,
  lastUpdated
}) => {
  // 로딩 상태
  if (isLoading) {
    return (
      <Box>
        <Text fontSize="lg" fontWeight="bold" mb={4} color="gray.700">
          📈 최근 매매 내역
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
          📈 최근 매매 내역
        </Text>
        <Box p={4} bg="red.50" borderRadius="md" borderLeft="4px" borderColor="red.400">
          <Text color="red.800" fontSize="sm">
            <strong>데이터 로드 오류:</strong> {error}
          </Text>
        </Box>
      </Box>
    );
  }

  // 시간순 정렬 (최신순)
  const sortedTrades = [...trades].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="lg" fontWeight="bold" color="gray.700">
          📈 최근 매매 내역
        </Text>
        <Text fontSize="xs" color="gray.500">
          총 {trades.length}건
        </Text>
      </Flex>

      <Box bg="white" borderRadius="lg" shadow="sm" border="1px" borderColor="gray.200" overflow="hidden">
        {sortedTrades.length === 0 ? (
          // 매매 내역이 없는 경우
          <Box p={8} textAlign="center">
            <Text color="gray.500" fontSize="md">
              📊 매매 내역이 없습니다.
            </Text>
            <Text color="gray.400" fontSize="sm" mt={2}>
              전략이 실행되면 매매 내역이 여기에 표시됩니다.
            </Text>
          </Box>
        ) : (
          // 매매 내역 목록
          <VStack gap={0} align="stretch">
            {sortedTrades.slice(0, 10).map((trade, index) => {
              const tradeBadge = getTradeBadge(trade.type);
              return (
                <Box 
                  key={trade.id} 
                  p={4} 
                  borderBottom={index < Math.min(sortedTrades.length, 10) - 1 ? "1px" : "none"}
                  borderColor="gray.100"
                  _hover={{ bg: 'gray.50' }}
                >
                  <Flex justify="space-between" align="start">
                    <Box flex="1">
                      <Flex align="center" gap={2} mb={2}>
                        <Text fontSize="sm">{tradeBadge.emoji}</Text>
                        <Badge colorScheme={tradeBadge.colorScheme} variant="subtle" size="sm">
                          {tradeBadge.text}
                        </Badge>
                        <Text fontWeight="bold" color="gray.800" fontSize="sm">
                          {getStockName(trade.symbol)}
                        </Text>
                        <Text color="gray.500" fontSize="xs">
                          ({trade.symbol})
                        </Text>
                      </Flex>
                      
                      <Flex align="center" gap={4} mb={1}>
                        <Text fontSize="xs" color="gray.600">
                          수량: <strong>{formatNumber(trade.quantity)}주</strong>
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          단가: <strong>{formatCurrency(trade.price)}</strong>
                        </Text>
                      </Flex>
                      
                      <Text fontSize="xs" color="gray.500">
                        {formatRelativeTime(trade.timestamp)}
                        {trade.strategyId && (
                          <Text as="span" ml={2} color="blue.500">
                            • 자동매매
                          </Text>
                        )}
                      </Text>
                    </Box>
                    
                    <Box textAlign="right">
                      <Text 
                        fontWeight="bold" 
                        fontSize="md"
                        color={trade.type === 'buy' ? 'red.600' : 'blue.600'}
                      >
                        {trade.type === 'buy' ? '-' : '+'}{formatCurrency(trade.amount)}
                      </Text>
                    </Box>
                  </Flex>
                </Box>
              );
            })}
            
            {sortedTrades.length > 10 && (
              <Box p={3} textAlign="center" bg="gray.50" borderTop="1px" borderColor="gray.100">
                <Text fontSize="xs" color="gray.500">
                  {sortedTrades.length - 10}건의 추가 내역이 있습니다.
                </Text>
              </Box>
            )}
          </VStack>
        )}
      </Box>
    </Box>
  );
}; 