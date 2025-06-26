/**
 * 메인 대시보드 컴포넌트
 * 계좌 정보, 전략 목록, 매매 내역을 통합하여 표시합니다.
 */

import React from 'react';
import {
  Box,
  VStack,
  Grid,
  Button,
  Text,
  Flex
} from '@chakra-ui/react';
import { useRealTimeData } from '../hooks/useRealTimeData';
import { AccountInfo } from './AccountInfo';
import { StrategyList } from './StrategyList';
import { TradeHistory } from './TradeHistory';

/**
 * 대시보드 컴포넌트
 */
export const Dashboard: React.FC = () => {
  const {
    accountInfo,
    strategies,
    recentTrades,
    isLoading,
    error,
    lastUpdated,
    refreshData
  } = useRealTimeData();

  /**
   * 데이터 새로고침 처리
   */
  const handleRefresh = () => {
    refreshData();
    // useToast 대신 간단한 알림으로 대체
    console.log('데이터 새로고침 중...');
  };

  /**
   * 마지막 업데이트 시간 포맷팅
   */
  const formatLastUpdated = (timestamp: number): string => {
    if (timestamp === 0) return '';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) {
      return '방금 전 업데이트';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}분 전 업데이트`;
    } else {
      return new Date(timestamp).toLocaleTimeString('ko-KR') + ' 업데이트';
    }
  };

  return (
    <Box minH="100vh" bg="gray.50">
      {/* 대시보드 헤더 */}
      <Box bg="white" shadow="sm" px={6} py={4} mb={6}>
        <Flex justify="space-between" align="center">
          <Box>
            <Text fontSize="xl" fontWeight="bold" color="gray.800">
              KIS Quant Dashboard
            </Text>
            {lastUpdated > 0 && (
              <Text fontSize="sm" color="gray.500" mt={1}>
                {formatLastUpdated(lastUpdated)}
              </Text>
            )}
          </Box>
          
          <Button
            size="sm"
            colorScheme="blue"
            variant="outline"
            onClick={handleRefresh}
            loading={isLoading}
            loadingText="새로고침 중..."
          >
            🔄 새로고침
          </Button>
        </Flex>
      </Box>

      {/* 메인 콘텐츠 */}
      <Box px={6} pb={6}>
        <VStack gap={8} maxW="1400px" mx="auto" align="stretch">
          {/* 계좌 정보 섹션 */}
          <AccountInfo
            accountInfo={accountInfo}
            isLoading={isLoading}
            error={error}
            lastUpdated={lastUpdated}
          />

          {/* 전략 및 매매 내역 섹션 */}
          <Grid
            templateColumns={{ base: '1fr', lg: '1fr 1fr' }}
            gap={8}
          >
            {/* 전략 목록 */}
            <StrategyList
              strategies={strategies}
              isLoading={isLoading}
              error={error}
              lastUpdated={lastUpdated}
            />

            {/* 매매 내역 */}
            <TradeHistory
              trades={recentTrades}
              isLoading={isLoading}
              error={error}
              lastUpdated={lastUpdated}
            />
          </Grid>

          {/* 추가 기능 안내 */}
          <Box
            p={6}
            bg="gradient-to-r"
            bgGradient="linear(to-r, blue.50, purple.50)"
            borderRadius="lg"
            border="1px"
            borderColor="blue.200"
          >
            <Text fontSize="lg" fontWeight="bold" mb={3} color="blue.800">
              🚀 다음 단계
            </Text>
            <VStack align="start" gap={2}>
              <Text fontSize="sm" color="blue.700">
                • 전략 생성 도구로 나만의 퀀트 전략을 만들어보세요
              </Text>
              <Text fontSize="sm" color="blue.700">
                • 백테스팅으로 전략의 성과를 검증해보세요
              </Text>
              <Text fontSize="sm" color="blue.700">
                • 검증된 전략으로 자동매매를 시작해보세요
              </Text>
            </VStack>
            <Button
              mt={4}
              size="sm"
              colorScheme="blue"
              variant="solid"
              disabled
            >
              곧 출시 예정
            </Button>
          </Box>

          {/* 시스템 상태 */}
          {error && (
            <Box
              p={4}
              bg="red.50"
              borderRadius="md"
              borderLeft="4px"
              borderColor="red.400"
            >
              <Text color="red.800" fontSize="sm">
                <strong>시스템 알림:</strong> {error}
              </Text>
              <Text color="red.600" fontSize="xs" mt={1}>
                문제가 지속되면 API 키 설정을 확인하거나 페이지를 새로고침해주세요.
              </Text>
            </Box>
          )}
        </VStack>
      </Box>
    </Box>
  );
}; 