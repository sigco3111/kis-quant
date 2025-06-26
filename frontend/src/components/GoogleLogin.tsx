/**
 * Google 로그인 컴포넌트
 * Firebase Google 인증을 통한 사용자 로그인 UI
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Alert,
  Heading,
  Image
} from '@chakra-ui/react';
import { googleAuthService, AuthState, GoogleUser } from '../services/GoogleAuthService';

interface GoogleLoginProps {
  onLoginSuccess: (user: GoogleUser) => void;
  onLoginError: (error: string) => void;
  disabled?: boolean;
  disabledMessage?: string;
}

/**
 * Google 로그인 컴포넌트
 */
export const GoogleLogin: React.FC<GoogleLoginProps> = ({
  onLoginSuccess,
  onLoginError,
  disabled = false,
  disabledMessage = "Firebase 설정을 먼저 완료해주세요."
}) => {
  // 상태 관리
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Google 인증 상태 구독
  useEffect(() => {
    const handleAuthStateChange = (state: AuthState) => {
      setAuthState(state);
      
      if (state.isAuthenticated && state.user) {
        setMessage({ type: 'success', text: `${state.user.displayName}님, 환영합니다!` });
        onLoginSuccess(state.user);
      } else if (state.error) {
        setMessage({ type: 'error', text: state.error });
        onLoginError(state.error);
      }
    };

    googleAuthService.onAuthStateChanged(handleAuthStateChange);

    // 초기 상태 설정
    setAuthState(googleAuthService.getAuthState());

    return () => {
      googleAuthService.offAuthStateChanged(handleAuthStateChange);
    };
  }, [onLoginSuccess, onLoginError]);

  /**
   * Google 로그인 처리
   */
  const handleGoogleLogin = async () => {
    setMessage(null);
    
    try {
      await googleAuthService.signInWithGoogle();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '로그인에 실패했습니다.';
      
      // Firebase 초기화 에러인 경우 더 친화적인 메시지 제공
      if (errorMessage.includes('초기화')) {
        const friendlyMessage = 'Google 로그인을 위해 Firebase 기본 설정이 필요합니다. 잠시 후 다시 시도해주세요.';
        setMessage({ type: 'error', text: friendlyMessage });
        onLoginError(friendlyMessage);
      } else {
        setMessage({ type: 'error', text: errorMessage });
        onLoginError(errorMessage);
      }
    }
  };

  /**
   * 로그아웃 처리
   */
  const handleLogout = async () => {
    try {
      await googleAuthService.signOut();
      setMessage({ type: 'info', text: '로그아웃되었습니다.' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '로그아웃에 실패했습니다.';
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  // 로그인된 상태일 때 사용자 정보 표시
  if (authState.isAuthenticated && authState.user) {
    return (
      <Box maxW="400px" mx="auto" mt={8} p={6} borderWidth={1} borderRadius="lg" shadow="md">
        <VStack gap={4} align="stretch">
          <Heading size="md" textAlign="center">로그인 완료</Heading>
          
          {/* 사용자 정보 */}
          <HStack gap={4} align="center" p={4} bg="green.50" borderRadius="md">
            {authState.user.photoURL && (
              <Image
                src={authState.user.photoURL}
                alt="프로필 사진"
                borderRadius="full"
                boxSize="50px"
              />
            )}
            <VStack align="start" gap={1}>
              <Text fontWeight="bold">{authState.user.displayName}</Text>
              <Text fontSize="sm" color="gray.600">{authState.user.email}</Text>
            </VStack>
          </HStack>

          {/* 메시지 표시 */}
          {message && (
            <Box 
              p={3} 
              borderRadius="md" 
              borderLeft="4px"
              bg={message.type === 'success' ? 'green.50' : message.type === 'error' ? 'red.50' : 'blue.50'}
              borderColor={message.type === 'success' ? 'green.400' : message.type === 'error' ? 'red.400' : 'blue.400'}
            >
              <Text color={message.type === 'success' ? 'green.800' : message.type === 'error' ? 'red.800' : 'blue.800'}>
                {message.text}
              </Text>
            </Box>
          )}

          {/* 로그아웃 버튼 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={authState.isLoading}
          >
            로그아웃
          </Button>
        </VStack>
      </Box>
    );
  }

  // 로그인 화면
  return (
    <Box maxW="400px" mx="auto" mt={8} p={6} borderWidth={1} borderRadius="lg" shadow="md">
      <VStack gap={6} align="stretch">
        <VStack gap={2}>
          <Heading size="md" textAlign="center">KIS Quant 로그인</Heading>
          <Text fontSize="sm" color="gray.600" textAlign="center">
            Google 계정으로 로그인하여 Firebase 설정을 저장하고 관리하세요
          </Text>
        </VStack>

                 {/* 메시지 표시 */}
        {message && (
          <Box 
            p={3} 
            borderRadius="md" 
            borderLeft="4px"
            bg={message.type === 'success' ? 'green.50' : message.type === 'error' ? 'red.50' : 'blue.50'}
            borderColor={message.type === 'success' ? 'green.400' : message.type === 'error' ? 'red.400' : 'blue.400'}
          >
            <Text color={message.type === 'success' ? 'green.800' : message.type === 'error' ? 'red.800' : 'blue.800'}>
              {message.text}
            </Text>
          </Box>
        )}

        {/* Google 로그인 버튼 */}
        <Button
          onClick={handleGoogleLogin}
          disabled={disabled || authState.isLoading}
          size="lg"
          colorScheme="blue"
        >
          🔐 {authState.isLoading ? '로그인 중...' : 'Google로 로그인'}
        </Button>
        
        {/* 비활성화 메시지 */}
        {disabled && (
          <Box p={3} bg="yellow.50" borderRadius="md" borderLeft="4px" borderColor="yellow.400">
            <Text fontSize="sm" color="yellow.800" textAlign="center">
              ⚠️ {disabledMessage}
            </Text>
          </Box>
        )}

        {/* 도움말 */}
        <Box p={3} bg="blue.50" borderRadius="md" borderLeft="4px" borderColor="blue.400">
          <Text fontSize="sm" color="blue.800">
            <strong>안전한 로그인:</strong> Google 계정으로 로그인하면 Firebase 설정이 암호화되어 저장되며, 
            다음번 로그인 시 자동으로 연결됩니다.
          </Text>
        </Box>
      </VStack>
    </Box>
  );
};

export default GoogleLogin; 