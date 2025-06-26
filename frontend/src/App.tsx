/**
 * KIS Quant 메인 애플리케이션
 * Firebase 연동 및 API 키 관리
 */

import React, { useState, useEffect } from 'react';
import { Box, VStack, Heading, Text, Button } from '@chakra-ui/react';
import { User } from 'firebase/auth';
import FirebaseSetup from './components/FirebaseSetup';
import { ApiKeySetup } from './components/ApiKeySetup';
import { Dashboard } from './components/Dashboard';
import { firebaseService } from './services/FirebaseService';
import { apiKeyService } from './services/ApiKeyService';
import './App.css';

/**
 * 메인 애플리케이션 컴포넌트
 */
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Firebase 인증 상태 및 API 키 확인
  useEffect(() => {
    try {
      const currentUser = firebaseService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setIsSetupComplete(true);
        
        // API 키 존재 여부 확인
        checkApiKeyExists();
      }

      // Firebase 인증 상태 변화 감지
      const unsubscribe = firebaseService.onAuthStateChanged((user) => {
        setUser(user);
        setIsSetupComplete(!!user);
        
        if (user) {
          checkApiKeyExists();
        } else {
          setHasApiKey(false);
        }
      });

      return () => unsubscribe();
    } catch (error) {
      // Firebase가 초기화되지 않은 경우 무시
      console.log('Firebase가 아직 초기화되지 않았습니다.');
    }
  }, []);

  /**
   * API 키 존재 여부 확인
   */
  const checkApiKeyExists = async () => {
    try {
      const hasKeys = apiKeyService.hasStoredApiKeys();
      setHasApiKey(hasKeys);
    } catch (error) {
      console.error('API 키 확인 오류:', error);
      setHasApiKey(false);
    }
  };

  /**
   * Firebase 연결 성공 처리
   */
  const handleConnectionSuccess = () => {
    setIsSetupComplete(true);
    setError(null);
    console.log('Firebase 연결 및 익명 인증 완료');
    checkApiKeyExists();
  };

  /**
   * Firebase 연결 오류 처리
   */
  const handleConnectionError = (errorMessage: string) => {
    setError(errorMessage);
    setIsSetupComplete(false);
    console.error('Firebase 연결 오류:', errorMessage);
  };

  /**
   * API 키 설정 완료 처리
   */
  const handleApiKeySetupComplete = () => {
    setHasApiKey(true);
  };

  /**
   * 연결 해제 처리
   */
  const handleDisconnect = () => {
    setUser(null);
    setIsSetupComplete(false);
    setHasApiKey(false);
    setError(null);
    // 페이지 새로고침으로 Firebase 연결 해제
    window.location.reload();
  };

  // Firebase 설정이 완료되지 않은 경우
  if (!isSetupComplete) {
    return (
      <Box minH="100vh" bg="gray.50">
        <VStack gap={8} py={8}>
          <Box textAlign="center" px={4}>
            <Heading size="lg" mb={4} color="gray.800">
              KIS Quant
            </Heading>
            <Text fontSize="md" color="gray.600" maxW="500px" mx="auto">
              한국투자증권 API를 활용한 퀀트 투자 플랫폼입니다.
              시작하려면 Firebase 프로젝트를 연결해주세요.
            </Text>
          </Box>

          <FirebaseSetup
            onConnectionSuccess={handleConnectionSuccess}
            onConnectionError={handleConnectionError}
          />

          {error && (
            <Box maxW="600px" mx="auto" px={4}>
              <Box
                p={4}
                bg="red.50"
                borderRadius="md"
                borderLeft="4px"
                borderColor="red.400"
              >
                <Text color="red.800" fontSize="sm">
                  <strong>연결 오류:</strong> {error}
                </Text>
              </Box>
            </Box>
          )}
        </VStack>
      </Box>
    );
  }

  // API 키가 설정되지 않은 경우
  if (!hasApiKey) {
    return (
      <Box minH="100vh" bg="gray.50">
        {/* 헤더 */}
        <Box bg="white" shadow="sm" px={6} py={4}>
          <Box w="full" display="flex" justifyContent="space-between" alignItems="center">
            <Heading size="md" color="gray.800">
              KIS Quant Setup
            </Heading>
            <Button size="sm" variant="outline" onClick={handleDisconnect}>
              연결 해제
            </Button>
          </Box>
          
          {user && (
            <Box w="full" textAlign="left" mt={2}>
              <Text fontSize="sm" color="gray.500">
                Firebase 익명 사용자: {user.uid.substring(0, 8)}...
              </Text>
            </Box>
          )}
        </Box>

        {/* 메인 콘텐츠 */}
        <Box p={6}>
          <VStack gap={6} maxW="1200px" mx="auto">
            {/* 환영 메시지 */}
            <Box
              p={6}
              bg="white"
              borderRadius="lg"
              shadow="sm"
              textAlign="center"
              w="full"
            >
              <Heading size="md" mb={2} color="gray.800">
                🎉 Firebase 연결 완료!
              </Heading>
              <Text color="gray.600" mb={4}>
                이제 한국투자증권 API 키를 설정하여 퀀트 투자를 시작하세요.
              </Text>
            </Box>

            {/* API 키 설정 */}
            <ApiKeySetup onSetupComplete={handleApiKeySetupComplete} />

            {/* 향후 기능 안내 */}
            <Box
              p={6}
              bg="blue.50"
              borderRadius="lg"
              borderLeft="4px"
              borderColor="blue.400"
              w="full"
            >
              <Heading size="sm" mb={3} color="blue.800">
                🚀 향후 제공될 기능
              </Heading>
              <VStack align="start" gap={2}>
                <Text fontSize="sm" color="blue.700">
                  • 실시간 주식 데이터 조회 및 분석
                </Text>
                <Text fontSize="sm" color="blue.700">
                  • 백테스팅 및 전략 검증
                </Text>
                <Text fontSize="sm" color="blue.700">
                  • 자동매매 시스템
                </Text>
                <Text fontSize="sm" color="blue.700">
                  • 포트폴리오 관리 및 리스크 분석
                </Text>
                <Text fontSize="sm" color="blue.700">
                  • 실시간 알림 및 리포트
                </Text>
              </VStack>
            </Box>
          </VStack>
        </Box>
      </Box>
    );
  }

  // 모든 설정이 완료된 경우 - 대시보드 표시
  return <Dashboard />;
}

export default App;
