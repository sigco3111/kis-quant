/**
 * 실시간 알림 시스템 컴포넌트
 * 매매 상황, 가격 변동, 시스템 상태에 대한 알림을 관리합니다.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  SimpleGrid,
  Spinner
} from '@chakra-ui/react';
import { notificationService, AlertType, AlertConfig } from '../services/NotificationService';

// 알림 메시지 인터페이스
interface AlertMessage {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface AlertSystemProps {
  userId?: string;
  maxAlerts?: number;
}

export const AlertSystem: React.FC<AlertSystemProps> = ({
  userId,
  maxAlerts = 50
}) => {
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  /**
   * 알림 시스템 초기화
   */
  const initializeAlertSystem = useCallback(async () => {
    try {
      // 알림 서비스 설정 로드
      const config = notificationService.getAlertConfig();
      const enabled = notificationService.isNotificationEnabled();
      
      setAlertConfig(config);
      setNotificationEnabled(enabled);
      
      // 목 알림 데이터 생성
      generateMockAlerts();
      
      setIsLoading(false);
    } catch (error) {
      console.error('알림 시스템 초기화 실패:', error);
      setIsLoading(false);
    }
  }, []);

  /**
   * 목 알림 데이터 생성
   */
  const generateMockAlerts = useCallback(() => {
    const mockAlerts: AlertMessage[] = [
      {
        id: 'alert_1',
        type: 'order_filled',
        title: '주문 체결',
        message: '삼성전자 100주 매수 주문이 체결되었습니다.',
        timestamp: Date.now() - 5 * 60 * 1000, // 5분 전
        isRead: false,
        severity: 'medium'
      },
      {
        id: 'alert_2',
        type: 'profit_target',
        title: '목표 수익 달성',
        message: 'NAVER 포지션이 +15% 수익률을 달성했습니다.',
        timestamp: Date.now() - 15 * 60 * 1000, // 15분 전
        isRead: false,
        severity: 'high'
      },
      {
        id: 'alert_3',
        type: 'price_alert',
        title: '가격 알림',
        message: 'SK하이닉스가 5% 이상 상승했습니다.',
        timestamp: Date.now() - 30 * 60 * 1000, // 30분 전
        isRead: true,
        severity: 'low'
      },
      {
        id: 'alert_4',
        type: 'system_error',
        title: '시스템 오류',
        message: 'API 연결에 일시적인 문제가 발생했습니다.',
        timestamp: Date.now() - 60 * 60 * 1000, // 1시간 전
        isRead: true,
        severity: 'critical'
      },
      {
        id: 'alert_5',
        type: 'daily_summary',
        title: '일일 요약',
        message: '오늘 총 수익률: +2.5%, 거래 횟수: 8회',
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2시간 전
        isRead: true,
        severity: 'low'
      }
    ];

    setAlerts(mockAlerts);
    setUnreadCount(mockAlerts.filter(alert => !alert.isRead).length);
  }, []);

  /**
   * 알림 권한 요청
   */
  const handleNotificationToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        const granted = await notificationService.requestPermission();
        if (granted) {
          setNotificationEnabled(true);
          // 테스트 알림 전송
          await notificationService.sendTestNotification();
        } else {
          setNotificationEnabled(false);
        }
      } else {
        await notificationService.setEnabled(false);
        setNotificationEnabled(false);
      }
    } catch (error) {
      console.error('알림 설정 변경 실패:', error);
    }
  };

  /**
   * 알림 설정 업데이트
   */
  const updateAlertConfig = async (key: keyof AlertConfig, value: number | boolean) => {
    if (!alertConfig) return;

    try {
      const newConfig = { ...alertConfig, [key]: value };
      await notificationService.updateAlertConfig(newConfig);
      setAlertConfig(newConfig);
    } catch (error) {
      console.error('알림 설정 업데이트 실패:', error);
    }
  };

  /**
   * 알림 읽음 처리
   */
  const markAsRead = (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, isRead: true } : alert
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  /**
   * 모든 알림 읽음 처리
   */
  const markAllAsRead = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, isRead: true })));
    setUnreadCount(0);
  };

  /**
   * 알림 삭제
   */
  const deleteAlert = (alertId: string) => {
    setAlerts(prev => {
      const alertToDelete = prev.find(alert => alert.id === alertId);
      const filtered = prev.filter(alert => alert.id !== alertId);
      
      if (alertToDelete && !alertToDelete.isRead) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      
      return filtered;
    });
  };

  /**
   * 알림 타입별 아이콘 반환
   */
  const getAlertIcon = (type: AlertType): string => {
    const iconMap: Record<AlertType, string> = {
      order_filled: '📈',
      profit_target: '🎯',
      stop_loss: '🛑',
      price_alert: '📊',
      system_error: '⚠️',
      server_down: '🔴',
      trading_stopped: '⏹️',
      daily_summary: '📋'
    };
    return iconMap[type] || '🔔';
  };

  /**
   * 심각도별 색상 반환
   */
  const getSeverityColor = (severity: AlertMessage['severity']): string => {
    const colorMap = {
      low: 'gray',
      medium: 'blue',
      high: 'orange',
      critical: 'red'
    };
    return colorMap[severity];
  };

  /**
   * 시간 포맷팅
   */
  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60 * 1000) return '방금 전';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}분 전`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}시간 전`;
    return new Date(timestamp).toLocaleDateString('ko-KR');
  };

  useEffect(() => {
    initializeAlertSystem();
  }, [initializeAlertSystem]);

  if (isLoading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" color="blue.500" />
        <Text mt={4} color="gray.600">알림 시스템 로딩 중...</Text>
      </Box>
    );
  }

  return (
    <VStack gap={6} align="stretch">
      {/* 헤더 */}
      <HStack justify="space-between" align="center">
        <HStack gap={2}>
          <Text fontSize="xl" fontWeight="bold">🔔 알림 센터</Text>
          {unreadCount > 0 && (
            <Badge colorScheme="red" borderRadius="full">
              {unreadCount}
            </Badge>
          )}
        </HStack>
        
        <HStack gap={4}>
          <Button size="sm" variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}>
            모두 읽음
          </Button>
          <HStack gap={2}>
            <Text fontSize="sm">알림</Text>
            <Button
              size="sm"
              variant={notificationEnabled ? "solid" : "outline"}
              colorScheme="blue"
              onClick={() => handleNotificationToggle(!notificationEnabled)}
            >
              {notificationEnabled ? "ON" : "OFF"}
            </Button>
          </HStack>
        </HStack>
      </HStack>

      {/* 알림 설정 */}
      {alertConfig && (
        <Box p={4} bg="white" borderRadius="lg" border="1px solid #E2E8F0">
          <Text fontSize="lg" fontWeight="600" mb={4}>알림 설정</Text>
          
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <HStack justify="space-between">
              <Text fontSize="sm">주문 체결 알림</Text>
              <Button
                size="xs"
                variant={alertConfig.orderExecution ? "solid" : "outline"}
                colorScheme="blue"
                onClick={() => updateAlertConfig('orderExecution', !alertConfig.orderExecution)}
              >
                {alertConfig.orderExecution ? "ON" : "OFF"}
              </Button>
            </HStack>
            
            <HStack justify="space-between">
              <Text fontSize="sm">시스템 오류 알림</Text>
              <Button
                size="xs"
                variant={alertConfig.systemError ? "solid" : "outline"}
                colorScheme="blue"
                onClick={() => updateAlertConfig('systemError', !alertConfig.systemError)}
              >
                {alertConfig.systemError ? "ON" : "OFF"}
              </Button>
            </HStack>
            
            <HStack justify="space-between">
              <Text fontSize="sm">서버 상태 알림</Text>
              <Button
                size="xs"
                variant={alertConfig.serverStatus ? "solid" : "outline"}
                colorScheme="blue"
                onClick={() => updateAlertConfig('serverStatus', !alertConfig.serverStatus)}
              >
                {alertConfig.serverStatus ? "ON" : "OFF"}
              </Button>
            </HStack>
          </SimpleGrid>
        </Box>
      )}

      {/* 알림 목록 */}
      <VStack gap={3} align="stretch">
        <Text fontSize="lg" fontWeight="600">최근 알림</Text>
        
        {alerts.length === 0 ? (
          <Box textAlign="center" py={8} color="gray.500">
            알림이 없습니다.
          </Box>
        ) : (
          alerts.map((alert) => (
            <Box
              key={alert.id}
              p={4}
              bg={alert.isRead ? 'white' : 'blue.50'}
              borderRadius="lg"
              border="1px solid #E2E8F0"
              _hover={{ bg: alert.isRead ? 'gray.50' : 'blue.100' }}
              cursor="pointer"
              onClick={() => !alert.isRead && markAsRead(alert.id)}
            >
              <HStack justify="space-between" align="start">
                <HStack gap={3} align="start" flex={1}>
                  <Text fontSize="xl">{getAlertIcon(alert.type)}</Text>
                  
                  <VStack align="start" gap={1} flex={1}>
                    <HStack gap={2}>
                      <Text fontWeight="bold" fontSize="sm">
                        {alert.title}
                      </Text>
                      <Badge 
                        size="sm" 
                        colorScheme={getSeverityColor(alert.severity)}
                      >
                        {alert.severity}
                      </Badge>
                      {!alert.isRead && (
                        <Badge size="sm" colorScheme="blue">
                          새로움
                        </Badge>
                      )}
                    </HStack>
                    
                    <Text fontSize="sm" color="gray.600">
                      {alert.message}
                    </Text>
                    
                    <Text fontSize="xs" color="gray.500">
                      {formatTime(alert.timestamp)}
                    </Text>
                  </VStack>
                </HStack>
                
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteAlert(alert.id);
                  }}
                >
                  삭제
                </Button>
              </HStack>
            </Box>
          ))
        )}
      </VStack>
    </VStack>
  );
};

export default AlertSystem; 