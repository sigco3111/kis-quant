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
import BacktestRunner from './BacktestRunner';
import BacktestResults from './BacktestResults';
import RealTimeMonitor from './RealTimeMonitor';
import TradingControl from './TradingControl';
import { Strategy, BacktestResult } from '../types/Strategy';

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
  
  // 백테스트 상태 관리
  const [showBacktestRunner, setShowBacktestRunner] = useState(false);
  const [backtestStrategy, setBacktestStrategy] = useState<Strategy | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [showBacktestResults, setShowBacktestResults] = useState(false);

  // 실시간 모니터링 상태 관리
  const [showRealTimeMonitor, setShowRealTimeMonitor] = useState(false);
  const [showTradingControl, setShowTradingControl] = useState(false);

  /**
   * 전략 편집 시작
   */
  const handleEditStrategy = (strategy: Strategy) => {
    setEditingStrategy(strategy);
    setShowStrategyBuilder(true);
  };

  /**
   * 전략 빌더 닫기
   */
  const handleCloseStrategyBuilder = () => {
    setShowStrategyBuilder(false);
    setEditingStrategy(null);
  };

  /**
   * 전략 저장 완료
   */
  const handleStrategySaved = () => {
    setShowStrategyBuilder(false);
    setEditingStrategy(null);
    refreshData(); // 데이터 새로고침
  };

  /**
   * 백테스트 시작
   */
  const handleStartBacktest = (strategy: Strategy) => {
    setBacktestStrategy(strategy);
    setShowBacktestRunner(true);
  };

  /**
   * 백테스트 완료
   */
  const handleBacktestComplete = (result: BacktestResult) => {
    setBacktestResult(result);
    setShowBacktestRunner(false);
    setShowBacktestResults(true);
  };

  /**
   * 백테스트 러너 닫기
   */
  const handleCloseBacktestRunner = () => {
    setShowBacktestRunner(false);
    setBacktestStrategy(null);
  };

  /**
   * 백테스트 결과 닫기
   */
  const handleCloseBacktestResults = () => {
    setShowBacktestResults(false);
    setBacktestResult(null);
    setBacktestStrategy(null);
  };

  /**
   * 실시간 모니터링 열기
   */
  const handleShowRealTimeMonitor = () => {
    setShowRealTimeMonitor(true);
  };

  /**
   * 실시간 모니터링 닫기
   */
  const handleCloseRealTimeMonitor = () => {
    setShowRealTimeMonitor(false);
  };

  /**
   * 매매 제어 열기
   */
  const handleShowTradingControl = () => {
    setShowTradingControl(true);
  };

  /**
   * 매매 제어 닫기
   */
  const handleCloseTradingControl = () => {
    setShowTradingControl(false);
  };

  // 실시간 모니터링 화면
  if (showRealTimeMonitor) {
    return (
      <RealTimeMonitor
        onClose={handleCloseRealTimeMonitor}
      />
    );
  }

  // 매매 제어 화면
  if (showTradingControl) {
    // 기본 전략 생성 (실제로는 선택된 전략을 사용해야 함)
    const defaultStrategy: Strategy = {
      id: 'default-strategy',
      name: '기본 자동매매 전략',
      description: '기본 자동매매 전략입니다.',
      symbols: ['005930'], // 삼성전자
      buyConditions: [],
      sellConditions: [],
      riskManagement: {
        stopLoss: 5,
        takeProfit: 10,
        maxPosition: 10,
        maxDailyTrades: 5
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: false,
      version: 1
    };

    return (
      <TradingControl
        strategy={defaultStrategy}
        onClose={handleCloseTradingControl}
      />
    );
  }

  // 백테스트 결과 표시
  if (showBacktestResults && backtestResult) {
    return (
      <BacktestResults
        result={backtestResult}
        onClose={handleCloseBacktestResults}
      />
    );
  }

  // 백테스트 실행 화면
  if (showBacktestRunner && backtestStrategy) {
    return (
      <BacktestRunner
        strategy={backtestStrategy}
        onBacktestComplete={handleBacktestComplete}
        onClose={handleCloseBacktestRunner}
      />
    );
  }

  // 전략 빌더 화면
  if (showStrategyBuilder) {
    return (
      <StrategyBuilder
        editingStrategy={editingStrategy}
        onSave={handleStrategySaved}
        onCancel={handleCloseStrategyBuilder}
      />
    );
  }

  // 메인 대시보드 화면
  return (
    <Box p={6}>
      <VStack gap={6} align="stretch">
        {/* 헤더 */}
        <Flex justify="space-between" align="center">
          <Box>
            <Text fontSize="2xl" fontWeight="bold" color="gray.700">
              📊 KIS Quant 대시보드
            </Text>
            <Text fontSize="sm" color="gray.500">
              마지막 업데이트: {new Date(lastUpdated).toLocaleString('ko-KR')}
            </Text>
          </Box>
          
          <Flex gap={3}>
            <Button
              colorScheme="green"
              onClick={() => setShowStrategyBuilder(true)}
              size="md"
            >
              📈 새 전략 생성
            </Button>

            <Button
              colorScheme="blue"
              onClick={handleShowRealTimeMonitor}
              size="md"
            >
              🔴 실시간 모니터링
            </Button>

            <Button
              colorScheme="purple"
              onClick={handleShowTradingControl}
              size="md"
            >
              🎯 매매 제어
            </Button>
            
            <Button
              variant="outline"
              onClick={refreshData}
              loading={isLoading}
              size="md"
            >
              🔄 새로고침
            </Button>
          </Flex>
        </Flex>

        {/* 오류 표시 */}
        {error && (
          <Box p={4} bg="red.50" border="1px" borderColor="red.200" borderRadius="md">
            <Text color="red.600" fontSize="sm">
              ⚠️ 데이터 로드 오류: {error}
            </Text>
          </Box>
        )}

        {/* 메인 콘텐츠 */}
        <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6}>
          {/* 왼쪽 컬럼 */}
          <VStack gap={6} align="stretch">
            {/* 계좌 정보 */}
            <AccountInfo 
              accountInfo={accountInfo}
              isLoading={isLoading}
              error={error}
              lastUpdated={lastUpdated}
            />

            {/* 전략 목록 */}
            <StrategyList
              strategies={strategies}
              isLoading={isLoading}
              error={error}
              lastUpdated={lastUpdated}
              onEditStrategy={handleEditStrategy}
              onStartBacktest={handleStartBacktest}
            />
          </VStack>

          {/* 오른쪽 컬럼 */}
          <VStack gap={6} align="stretch">
            {/* 매매 내역 */}
            <TradeHistory
              trades={recentTrades}
              isLoading={isLoading}
              error={error}
              lastUpdated={lastUpdated}
            />

            {/* 전략 생성 안내 */}
            <Box p={6} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
              <Text fontSize="lg" fontWeight="semibold" color="blue.700" mb={3}>
                🚀 퀀트 투자 시작하기
              </Text>
              <Text fontSize="sm" color="blue.600" mb={4}>
                • 코딩 없이 전략 생성<br/>
                • 과거 데이터로 백테스트<br/>
                • 자동매매 실행<br/>
                • 실시간 성과 모니터링
              </Text>
              <Button
                colorScheme="blue"
                size="sm"
                onClick={() => setShowStrategyBuilder(true)}
                width="full"
              >
                지금 전략 만들기
              </Button>
            </Box>
          </VStack>
        </Grid>
      </VStack>
    </Box>
  );
}; 