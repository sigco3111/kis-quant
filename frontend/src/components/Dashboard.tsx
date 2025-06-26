/**
 * 메인 대시보드 컴포넌트
 * 계좌 정보, 전략 목록, 매매 내역을 통합하여 표시합니다.
 */

import React, { useState } from 'react';
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
import StrategyBuilder from './StrategyBuilder';
import { Strategy } from '../types/Strategy';

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

  // 전략 빌더 상태 관리
  const [showStrategyBuilder, setShowStrategyBuilder] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);

  /**
   * 데이터 새로고침 처리
   */
  const handleRefresh = () => {
    refreshData();
    // useToast 대신 간단한 알림으로 대체
    console.log('데이터 새로고침 중...');
  };

  /**
   * 새 전략 생성 시작
   */
  const handleCreateStrategy = () => {
    setEditingStrategy(null);
    setShowStrategyBuilder(true);
  };

  /**
   * 전략 편집 시작
   */
  const handleEditStrategy = (strategy: Strategy) => {
    setEditingStrategy(strategy);
    setShowStrategyBuilder(true);
  };

  /**
   * 전략 저장 완료
   */
  const handleStrategySaved = (strategy: Strategy) => {
    console.log('전략 저장 완료:', strategy.name);
    setShowStrategyBuilder(false);
    setEditingStrategy(null);
    // 실제로는 전략 목록을 새로고침해야 함
    refreshData();
  };

  /**
   * 전략 빌더 취소
   */
  const handleStrategyBuilderCancel = () => {
    setShowStrategyBuilder(false);
    setEditingStrategy(null);
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

  // 전략 빌더 화면 표시
  if (showStrategyBuilder) {
    return (
      <Box minH="100vh" bg="gray.50">
        <StrategyBuilder
          strategy={editingStrategy}
          onSave={handleStrategySaved}
          onCancel={handleStrategyBuilderCancel}
        />
      </Box>
    );
  }

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
          
          <Flex gap={3}>
            <Button
              size="sm"
              colorScheme="green"
              onClick={handleCreateStrategy}
            >
              📈 새 전략 생성
            </Button>
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
              onEditStrategy={handleEditStrategy}
            />

            {/* 매매 내역 */}
            <TradeHistory
              trades={recentTrades}
              isLoading={isLoading}
              error={error}
              lastUpdated={lastUpdated}
            />
          </Grid>

          {/* 전략 생성 안내 */}
          <Box
            p={6}
            bg="gradient-to-r"
            bgGradient="linear(to-r, green.50, blue.50)"
            borderRadius="lg"
            border="1px"
            borderColor="green.200"
          >
            <Text fontSize="lg" fontWeight="bold" mb={3} color="green.800">
              🎯 전략 생성 시스템
            </Text>
            <VStack align="start" gap={2}>
              <Text fontSize="sm" color="green.700">
                • 드래그앤드롭으로 직관적인 전략 생성
              </Text>
              <Text fontSize="sm" color="green.700">
                • 8가지 기술 지표 지원 (SMA, EMA, RSI, MACD, 볼린저밴드 등)
              </Text>
              <Text fontSize="sm" color="green.700">
                • 복잡한 매수/매도 조건 설정 가능
              </Text>
              <Text fontSize="sm" color="green.700">
                • 리스크 관리 및 손절/익절 설정
              </Text>
              <Text fontSize="sm" color="green.700">
                • 골든 크로스 등 기본 템플릿 제공
              </Text>
            </VStack>
            <Flex gap={3} mt={4}>
              <Button
                size="sm"
                colorScheme="green"
                onClick={handleCreateStrategy}
              >
                지금 전략 만들기
              </Button>
              <Button
                size="sm"
                variant="outline"
                colorScheme="blue"
                disabled
              >
                백테스팅 (준비 중)
              </Button>
            </Flex>
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