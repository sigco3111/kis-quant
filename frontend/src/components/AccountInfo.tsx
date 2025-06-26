/**
 * 계좌 정보 표시 컴포넌트
 * 총 자산, 가용 금액, 수익률 등을 카드 형태로 표시합니다.
 */

import React from 'react';
import {
  Box,
  Grid,
  Text,
  Spinner,
  Flex
} from '@chakra-ui/react';
import { AccountInfo as AccountInfoType } from '../hooks/useRealTimeData';

interface AccountInfoProps {
  accountInfo: AccountInfoType | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

/**
 * 숫자를 한국 원화 형식으로 포맷팅
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
 * 수익률을 퍼센트 형식으로 포맷팅
 */
const formatPercentage = (rate: number): string => {
  return `${rate >= 0 ? '+' : ''}${rate.toFixed(2)}%`;
};

/**
 * 마지막 업데이트 시간을 포맷팅
 */
const formatLastUpdated = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) {
    return '방금 전';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}분 전`;
  } else {
    return new Date(timestamp).toLocaleTimeString('ko-KR');
  }
};

/**
 * 계좌 정보 컴포넌트
 */
export const AccountInfo: React.FC<AccountInfoProps> = ({
  accountInfo,
  isLoading,
  error,
  lastUpdated
}) => {
  // 로딩 상태
  if (isLoading) {
    return (
      <Box>
        <Text fontSize="lg" fontWeight="bold" mb={4} color="gray.700">
          📊 계좌 현황
        </Text>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
          {[1, 2, 3].map((index) => (
            <Box key={index} p={6} bg="white" borderRadius="lg" shadow="sm" border="1px" borderColor="gray.200">
              <Flex justify="center" align="center" h="100px">
                <Spinner size="lg" color="blue.500" />
              </Flex>
            </Box>
          ))}
        </Grid>
      </Box>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <Box>
        <Text fontSize="lg" fontWeight="bold" mb={4} color="gray.700">
          📊 계좌 현황
        </Text>
        <Box p={4} bg="red.50" borderRadius="md" borderLeft="4px" borderColor="red.400">
          <Text color="red.800" fontSize="sm">
            <strong>데이터 로드 오류:</strong> {error}
          </Text>
        </Box>
      </Box>
    );
  }

  // 데이터가 없는 경우
  if (!accountInfo) {
    return (
      <Box>
        <Text fontSize="lg" fontWeight="bold" mb={4} color="gray.700">
          📊 계좌 현황
        </Text>
        <Box p={4} bg="blue.50" borderRadius="md" borderLeft="4px" borderColor="blue.400">
          <Text color="blue.800" fontSize="sm">
            <strong>데이터 없음:</strong> 계좌 정보를 불러올 수 없습니다. API 키 설정을 확인해주세요.
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="lg" fontWeight="bold" color="gray.700">
          📊 계좌 현황
        </Text>
        <Text fontSize="xs" color="gray.500">
          🔄 {formatLastUpdated(lastUpdated)}
        </Text>
      </Flex>

      <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
        {/* 총 자산 */}
        <Box p={6} bg="blue.50" borderRadius="lg" border="1px" borderColor="blue.200">
          <Box>
            <Flex align="center" gap={2} mb={2}>
              <Text fontSize="lg">💰</Text>
              <Text color="blue.700" fontSize="sm" fontWeight="medium">
                총 자산
              </Text>
            </Flex>
            <Text color="blue.800" fontSize="2xl" fontWeight="bold">
              {formatCurrency(accountInfo.totalAssets)}
            </Text>
            <Text color="blue.600" fontSize="xs" mt={1}>
              평가 금액 기준
            </Text>
          </Box>
        </Box>

        {/* 가용 금액 */}
        <Box p={6} bg="green.50" borderRadius="lg" border="1px" borderColor="green.200">
          <Box>
            <Flex align="center" gap={2} mb={2}>
              <Text fontSize="lg">💳</Text>
              <Text color="green.700" fontSize="sm" fontWeight="medium">
                가용 금액
              </Text>
            </Flex>
            <Text color="green.800" fontSize="2xl" fontWeight="bold">
              {formatCurrency(accountInfo.availableCash)}
            </Text>
            <Text color="green.600" fontSize="xs" mt={1}>
              매수 가능 금액
            </Text>
          </Box>
        </Box>

        {/* 수익률 */}
        <Box 
          p={6} 
          bg={accountInfo.profitRate >= 0 ? "red.50" : "blue.50"}
          borderRadius="lg" 
          border="1px" 
          borderColor={accountInfo.profitRate >= 0 ? "red.200" : "blue.200"}
        >
          <Box>
            <Flex align="center" gap={2} mb={2}>
              <Text fontSize="lg">
                {accountInfo.profitRate >= 0 ? "📈" : "📉"}
              </Text>
              <Text 
                color={accountInfo.profitRate >= 0 ? "red.700" : "blue.700"}
                fontSize="sm" 
                fontWeight="medium"
              >
                총 수익률
              </Text>
            </Flex>
            <Text 
              color={accountInfo.profitRate >= 0 ? "red.800" : "blue.800"}
              fontSize="2xl"
              fontWeight="bold"
            >
              {formatPercentage(accountInfo.profitRate)}
            </Text>
            <Text 
              color={accountInfo.profitRate >= 0 ? "red.600" : "blue.600"}
              fontSize="xs" 
              mt={1}
            >
              {formatCurrency(accountInfo.profitAmount)}
            </Text>
          </Box>
        </Box>
      </Grid>
    </Box>
  );
}; 