/**
 * KIS Quant 메인 애플리케이션
 * Firebase 연동 및 사용자 인증 관리
 */

import React, { useState, useEffect } from 'react';
import { Box, VStack, Heading, Text, Button } from '@chakra-ui/react';
import { User } from 'firebase/auth';
import FirebaseSetup from './components/FirebaseSetup';
import { ApiKeySetup } from './components/ApiKeySetup';
import { firebaseService } from './services/FirebaseService';
import { googleAuthService, GoogleUser, AuthState } from './services/GoogleAuthService';
import { userConfigService } from './services/UserConfigService';
import './App.css';

/**
 * 메인 애플리케이션 컴포넌트
 */
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);

  // Google 인증 상태 확인 및 자동 연결
  useEffect(() => {
    const handleAuthStateChange = async (authState: AuthState) => {
      setGoogleUser(authState.user);
      
      if (authState.isAuthenticated && authState.user) {
        // Google 로그인 성공 시 저장된 Firebase 설정 자동 로드 시도
        await attemptAutoConnect(authState.user);
      } else {
        // 로그아웃 시 상태 초기화
        setUser(null);
        setIsSetupComplete(false);
        setError(null);
        setIsAutoConnecting(false);
      }
    };

    // Google 인증 상태 구독
    googleAuthService.onAuthStateChanged(handleAuthStateChange);

    // 초기 상태 설정
    const initialState = googleAuthService.getAuthState();
    if (initialState.isAuthenticated && initialState.user) {
      handleAuthStateChange(initialState);
    }

    return () => {
      googleAuthService.offAuthStateChanged(handleAuthStateChange);
    };
  }, []);

  // Firebase 인증 상태 확인
  useEffect(() => {
    try {
      const currentUser = firebaseService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setIsSetupComplete(true);
      }

      // Firebase 인증 상태 변화 감지
      const unsubscribe = firebaseService.onAuthStateChanged((user) => {
        setUser(user);
        setIsSetupComplete(!!user);
      });

      return () => unsubscribe();
    } catch (error) {
      // Firebase가 초기화되지 않은 경우 무시
      console.log('Firebase가 아직 초기화되지 않았습니다.');
    }
  }, []);

  /**
   * 저장된 설정으로 자동 연결 시도
   * @param googleUser Google 사용자 정보
   */
  const attemptAutoConnect = async (googleUser: GoogleUser) => {
    try {
      // 저장된 설정이 있는지 확인
      const hasConfig = await userConfigService.hasUserFirebaseConfig(googleUser.uid);
      
      if (hasConfig) {
        console.log('저장된 Firebase 설정을 발견했습니다. 자동 연결을 위해 사용자 입력을 기다립니다.');
        // 사용자가 비밀번호를 입력해야 하므로 여기서는 알림만 표시
        setError(null);
      }
    } catch (error) {
      console.error('자동 연결 확인 실패:', error);
    }
  };

  /**
   * Firebase 연결 성공 처리
   */
  const handleConnectionSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setIsSetupComplete(true);
    setError(null);
    console.log('Firebase 연결 및 인증 완료:', authenticatedUser.uid);
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
   * 로그아웃 처리
   */
  const handleSignOut = () => {
    setUser(null);
    setIsSetupComplete(false);
    setError(null);
    // Firebase 서비스 정리는 FirebaseService에서 처리
  };

  return (
    <Box minH="100vh" bg="gray.50">
      {!isSetupComplete ? (
          // Firebase 설정 단계
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
        ) : (
          // 메인 대시보드 (향후 구현)
          <Box>
            {/* 헤더 */}
            <Box bg="white" shadow="sm" px={6} py={4}>
              <VStack gap={4}>
                <Box w="full" display="flex" justifyContent="space-between" alignItems="center">
                  <Heading size="md" color="gray.800">
                    KIS Quant Dashboard
                  </Heading>
                  <Button size="sm" variant="outline" onClick={handleSignOut}>
                    연결 해제
                  </Button>
                </Box>
                
                {googleUser && (
                  <Box w="full" textAlign="left">
                    <Text fontSize="sm" color="gray.600">
                      로그인: {googleUser.displayName} ({googleUser.email})
                    </Text>
                  </Box>
                )}
                
                {user && (
                  <Box w="full" textAlign="left">
                    <Text fontSize="sm" color="gray.500">
                      Firebase UID: {user.uid.substring(0, 8)}...
                    </Text>
                  </Box>
                )}
              </VStack>
            </Box>

            {/* 메인 콘텐츠 */}
            <Box p={6}>
              <VStack gap={6} maxW="1200px" mx="auto">
                {/* 환영 메시지 */}
                <Box
                  p={6}
                  bg="white"
                  borderRadius="lg"
                  shadow="md"
                  w="full"
                  textAlign="center"
                >
                  <Heading size="md" mb={4} color="gray.800">
                    Firebase 연결 완료!
                  </Heading>
                  <Text color="gray.600" mb={4}>
                    성공적으로 Firebase에 연결되었습니다. 
                    이제 한국투자증권 API 키를 설정하여 퀀트 투자를 시작하세요.
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    ✅ Firebase 연동 및 인증 시스템 구현 완료
                  </Text>
                </Box>

                {/* API 키 설정 섹션 */}
                <Box
                  p={6}
                  bg="white"
                  borderRadius="lg"
                  shadow="md"
                  w="full"
                >
                  <Heading size="md" mb={6} color="gray.800" textAlign="center">
                    한국투자증권 API 키 설정
                  </Heading>
                  <ApiKeySetup />
                </Box>

                {/* 다음 단계 안내 */}
                <Box
                  p={4}
                  bg="blue.50"
                  borderRadius="md"
                  borderLeft="4px"
                  borderColor="blue.400"
                  w="full"
                >
                  <Text fontWeight="bold" mb={2} color="blue.800">
                    다음 구현 예정 기능
                  </Text>
                  <VStack gap={1} align="start">
                    <Text fontSize="sm" color="blue.700">
                      ✅ API 키 암호화 저장 시스템 (현재 구현됨)
                    </Text>
                    <Text fontSize="sm" color="blue.700">
                      • 백엔드 API 프록시 시스템
                    </Text>
                    <Text fontSize="sm" color="blue.700">
                      • 기본 대시보드 UI
                    </Text>
                    <Text fontSize="sm" color="blue.700">
                      • 전략 생성 및 관리 시스템
                    </Text>
                    <Text fontSize="sm" color="blue.700">
                      • 백테스팅 엔진
                    </Text>
                    <Text fontSize="sm" color="blue.700">
                      • 자동매매 시스템
                    </Text>
                  </VStack>
                </Box>
              </VStack>
            </Box>
          </Box>
        )}
      </Box>
  );
}

export default App;
