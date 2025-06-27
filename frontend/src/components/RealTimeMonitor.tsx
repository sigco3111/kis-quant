/**
 * 실시간 모니터링 메인 대시보드 컴포넌트
 * 포지션, 성과, 알림 등 모든 실시간 정보를 통합 관리합니다.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  ButtonGroup,
  Spinner,
  Badge
} from '@chakra-ui/react';
import PositionMonitor from './PositionMonitor';
import PerformanceChart from './PerformanceChart';
import AlertSystem from './AlertSystem';
import { notificationService } from '../services/NotificationService';

// 모니터링 상태 인터페이스
interface MonitoringStatus {
  isConnected: boolean;
  lastUpdate: number;
  dataQuality: 'good' | 'fair' | 'poor';
  alertCount: number;
}

interface RealTimeMonitorProps {
  userId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onClose?: () => void;
}

export const RealTimeMonitor: React.FC<RealTimeMonitorProps> = ({
  userId,
  autoRefresh = true,
  refreshInterval = 1000,
  onClose
}) => {
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus>({
    isConnected: false,
    lastUpdate: 0,
    dataQuality: 'good',
    alertCount: 0
  });
  const [selectedTab, setSelectedTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  /**
   * 모니터링 시스템 초기화
   */
  useEffect(() => {
    const initializeMonitoring = async () => {
      try {
        // 알림 시스템 초기화
        await notificationService.requestPermission();
        
        // 모니터링 상태 업데이트 시뮬레이션
        setMonitoringStatus({
          isConnected: true,
          lastUpdate: Date.now(),
          dataQuality: 'good',
          alertCount: 2
        });
        
        setIsLoading(false);
        
        // 환영 알림 전송
        setTimeout(() => {
          notificationService.sendAlert('daily_summary', {
            totalReturn: 2.5,
            tradeCount: 8
          });
        }, 2000);
        
      } catch (error) {
        console.error('모니터링 시스템 초기화 실패:', error);
        setIsLoading(false);
      }
    };

    initializeMonitoring();
  }, []);

  /**
   * 실시간 상태 업데이트
   */
  useEffect(() => {
    if (!autoRefresh || isPaused) return;

    const interval = setInterval(() => {
      setMonitoringStatus(prev => ({
        ...prev,
        lastUpdate: Date.now(),
        isConnected: Math.random() > 0.05, // 95% 연결 확률
        dataQuality: Math.random() > 0.1 ? 'good' : Math.random() > 0.5 ? 'fair' : 'poor'
      }));
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, isPaused, refreshInterval]);

  /**
   * 모니터링 일시정지/재개
   */
  const toggleMonitoring = () => {
    setIsPaused(!isPaused);
    
    if (!isPaused) {
      notificationService.sendAlert('trading_stopped', {
        reason: '사용자 요청'
      });
    }
  };

  /**
   * 긴급 정지
   */
  const emergencyStop = () => {
    setIsPaused(true);
    notificationService.sendAlert('trading_stopped', {
      reason: '긴급 정지'
    });
  };

  /**
   * 연결 상태 색상 반환
   */
  const getConnectionColor = (): string => {
    if (!monitoringStatus.isConnected) return 'red';
    if (monitoringStatus.dataQuality === 'poor') return 'orange';
    if (monitoringStatus.dataQuality === 'fair') return 'yellow';
    return 'green';
  };

  /**
   * 상태 표시 컴포넌트
   */
  const StatusIndicator = () => (
    <HStack gap={4} p={4} bg="white" borderRadius="lg" border="1px solid #E2E8F0">
      {/* 연결 상태 */}
      <HStack gap={2}>
        <Box
          width="12px"
          height="12px"
          borderRadius="50%"
          backgroundColor={getConnectionColor()}
          animation={monitoringStatus.isConnected ? 'pulse 2s infinite' : undefined}
        />
        <VStack align="start" gap={0}>
          <Text fontSize="sm" fontWeight="600">
            {monitoringStatus.isConnected ? '실시간 연결됨' : '연결 끊김'}
          </Text>
          <Text fontSize="xs" color="gray.500">
            데이터 품질: {monitoringStatus.dataQuality === 'good' ? '양호' : 
                        monitoringStatus.dataQuality === 'fair' ? '보통' : '불량'}
          </Text>
        </VStack>
      </HStack>

      {/* 마지막 업데이트 */}
      <VStack align="start" gap={0}>
        <Text fontSize="sm" fontWeight="600">마지막 업데이트</Text>
        <Text fontSize="xs" color="gray.500">
          {monitoringStatus.lastUpdate > 0 
            ? new Date(monitoringStatus.lastUpdate).toLocaleTimeString('ko-KR')
            : '없음'
          }
        </Text>
      </VStack>

      {/* 알림 개수 */}
      <HStack gap={2}>
        <Text fontSize="sm" fontWeight="600">알림</Text>
        <Badge colorScheme="red" borderRadius="full">
          {monitoringStatus.alertCount}
        </Badge>
      </HStack>

      {/* 컨트롤 버튼 */}
      <HStack gap={2} ml="auto">
        <Button
          size="sm"
          variant={isPaused ? "solid" : "outline"}
          colorScheme={isPaused ? "green" : "orange"}
          onClick={toggleMonitoring}
        >
          {isPaused ? '재개' : '일시정지'}
        </Button>
        
        <Button
          size="sm"
          variant="solid"
          colorScheme="red"
          onClick={emergencyStop}
          disabled={isPaused}
        >
          긴급정지
        </Button>
      </HStack>
    </HStack>
  );

  if (isLoading) {
    return (
      <Box textAlign="center" py={12}>
        <Spinner size="xl" color="blue.500" />
        <VStack gap={2} mt={6}>
          <Text fontSize="lg" fontWeight="600">실시간 모니터링 시스템 초기화 중...</Text>
          <Text color="gray.600">데이터 연결을 설정하고 있습니다.</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <VStack gap={6} align="stretch" p={6} bg="gray.50" minH="100vh">
      {/* 헤더 */}
      <HStack justify="space-between" align="center">
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
          <VStack align="start" gap={1}>
            <Text fontSize="2xl" fontWeight="bold">🔴 실시간 모니터링</Text>
            <Text color="gray.600">자동매매 시스템의 실시간 상태를 모니터링합니다</Text>
          </VStack>
        </HStack>
        
        <ButtonGroup size="sm">
          <Button variant="outline" onClick={() => window.location.reload()}>
            새로고침
          </Button>
          <Button variant="solid" colorScheme="blue">
            설정
          </Button>
        </ButtonGroup>
      </HStack>

      {/* 상태 표시 */}
      <StatusIndicator />

      {/* 모니터링 탭 */}
      <Box bg="white" borderRadius="lg" border="1px solid #E2E8F0" overflow="hidden">
        {/* 탭 헤더 */}
        <HStack p={4} borderBottom="1px solid #E2E8F0" gap={2}>
          <Button
            size="sm"
            variant={selectedTab === 0 ? "solid" : "ghost"}
            colorScheme={selectedTab === 0 ? "blue" : "gray"}
            onClick={() => setSelectedTab(0)}
          >
            📊 포지션 현황
            {selectedTab === 0 && (
              <Badge ml={2} size="sm" colorScheme="blue">실시간</Badge>
            )}
          </Button>
          
          <Button
            size="sm"
            variant={selectedTab === 1 ? "solid" : "ghost"}
            colorScheme={selectedTab === 1 ? "green" : "gray"}
            onClick={() => setSelectedTab(1)}
          >
            📈 성과 차트
            {selectedTab === 1 && (
              <Badge ml={2} size="sm" colorScheme="green">라이브</Badge>
            )}
          </Button>
          
          <Button
            size="sm"
            variant={selectedTab === 2 ? "solid" : "ghost"}
            colorScheme={selectedTab === 2 ? "red" : "gray"}
            onClick={() => setSelectedTab(2)}
          >
            🔔 알림 센터
            {monitoringStatus.alertCount > 0 && (
              <Badge ml={2} size="sm" colorScheme="red">{monitoringStatus.alertCount}</Badge>
            )}
          </Button>
        </HStack>

        {/* 탭 내용 */}
        <Box p={6}>
          {selectedTab === 0 && (
            <PositionMonitor 
              userId={userId} 
              refreshInterval={isPaused ? 0 : refreshInterval}
            />
          )}
          
          {selectedTab === 1 && (
            <PerformanceChart 
              userId={userId}
              refreshInterval={isPaused ? 0 : refreshInterval * 2}
            />
          )}
          
          {selectedTab === 2 && (
            <AlertSystem 
              userId={userId}
            />
          )}
        </Box>
      </Box>

      {/* 하단 정보 */}
      <HStack justify="center" color="gray.500" fontSize="sm">
        <Text>KIS Quant v2.0 실시간 모니터링 시스템</Text>
        <Text>•</Text>
        <Text>
          {isPaused ? '일시정지됨' : `${refreshInterval}ms 간격으로 업데이트`}
        </Text>
      </HStack>
    </VStack>
  );
};

export default RealTimeMonitor; 