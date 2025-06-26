/**
 * Firebase 설정 입력 컴포넌트
 * 사용자의 Firebase 프로젝트 정보를 입력받고 연결 테스트를 수행
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Alert,
  Progress,
  Heading,
  Textarea
} from '@chakra-ui/react';
import { firebaseService, FirebaseConfig, ConnectionStatus } from '../services/FirebaseService';

interface FirebaseSetupProps {
  onConnectionSuccess: (user: any) => void;
  onConnectionError: (error: string) => void;
}

/**
 * Firebase 설정 컴포넌트
 */
export const FirebaseSetup: React.FC<FirebaseSetupProps> = ({
  onConnectionSuccess,
  onConnectionError
}) => {
  // 폼 상태 관리
  const [formData, setFormData] = useState<FirebaseConfig>({
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });

  // UI 상태 관리
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isAuthenticated: false,
    user: null,
    error: null
  });
  const [showHelp, setShowHelp] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  /**
   * 환경변수에서 Firebase 설정값 로드
   */
  const loadFromEnvironment = () => {
    try {
      const envConfig: FirebaseConfig = {
        apiKey: process.env.REACT_APP_FIREBASE_API_KEY || '',
        authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || '',
        databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || '',
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || '',
        storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.REACT_APP_FIREBASE_APP_ID || ''
      };

      // 환경변수에서 값이 있는 필드만 업데이트
      const validEnvValues: Partial<FirebaseConfig> = {};
      let foundValues = 0;

      Object.entries(envConfig).forEach(([key, value]) => {
        if (value && value.trim().length > 0) {
          validEnvValues[key as keyof FirebaseConfig] = value.trim();
          foundValues++;
        }
      });
      
      if (foundValues > 0) {
        setFormData(prevData => ({
          ...prevData,
          ...validEnvValues
        }));
        
        setMessage({ 
          type: 'info', 
          text: `환경변수에서 ${foundValues}개의 Firebase 설정을 불러왔습니다.` 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: '환경변수에서 Firebase 설정을 찾을 수 없습니다. .env 파일을 확인해주세요.' 
        });
      }
    } catch (error) {
      console.error('환경변수 로드 중 오류:', error);
      setMessage({ 
        type: 'error', 
        text: '환경변수 로드 중 오류가 발생했습니다.' 
      });
    }
  };

  // 컴포넌트 마운트 시 환경변수에서 설정값 로드
  useEffect(() => {
    loadFromEnvironment();
  }, []);

  // Firebase 연결 상태 구독
  useEffect(() => {
    const handleStatusChange = (status: ConnectionStatus) => {
      setConnectionStatus(status);
      
      if (status.isAuthenticated && status.user) {
        setMessage({ type: 'success', text: `인증 완료 (UID: ${status.user.uid.substring(0, 8)}...)` });
        onConnectionSuccess(status.user);
      } else if (status.error) {
        setMessage({ type: 'error', text: status.error });
        onConnectionError(status.error);
      } else if (status.isConnected) {
        setMessage({ type: 'success', text: 'Firebase 연결됨' });
      }
    };

    firebaseService.onConnectionStatusChanged(handleStatusChange);

    return () => {
      firebaseService.offConnectionStatusChanged(handleStatusChange);
    };
  }, [onConnectionSuccess, onConnectionError]);

  /**
   * 입력 필드 변경 처리
   */
  const handleInputChange = (field: keyof FirebaseConfig, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // 필드 에러 초기화
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  /**
   * 폼 유효성 검증
   */
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    
    // 필수 필드 검증
    Object.entries(formData).forEach(([key, value]) => {
      if (!value.trim()) {
        errors[key] = `${getFieldLabel(key as keyof FirebaseConfig)}은(는) 필수입니다.`;
      }
    });

    // 형식 검증
    if (formData.databaseURL && 
        !formData.databaseURL.includes('firebaseio.com') && 
        !formData.databaseURL.includes('firebasedatabase.app')) {
      errors.databaseURL = '올바른 Database URL 형식이 아닙니다.';
    }

    if (formData.authDomain && !formData.authDomain.includes('firebaseapp.com')) {
      errors.authDomain = '올바른 Auth Domain 형식이 아닙니다.';
    }

    if (formData.apiKey && formData.apiKey.length < 30) {
      errors.apiKey = 'API 키가 너무 짧습니다.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Firebase 연결 테스트
   */
  const handleConnect = async () => {
    if (!validateForm()) {
      setMessage({ type: 'error', text: '모든 필드를 올바르게 입력해주세요.' });
      return;
    }

    setIsConnecting(true);
    setIsLoading(true);
    setMessage(null);

    try {
      // Firebase 초기화
      const isInitialized = await firebaseService.initializeFirebase(formData);
      
      if (isInitialized) {
        // 익명 인증 수행
        await firebaseService.signInAnonymously();
        setMessage({ type: 'success', text: 'Firebase 연결 및 인증이 완료되었습니다.' });
      } else {
        throw new Error('Firebase 초기화에 실패했습니다.');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '연결에 실패했습니다.';
      setMessage({ type: 'error', text: errorMessage });
      onConnectionError(errorMessage);
    } finally {
      setIsConnecting(false);
      setIsLoading(false);
    }
  };

  /**
   * 설정 초기화
   */
  const handleReset = () => {
    setFormData({
      apiKey: '',
      authDomain: '',
      databaseURL: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
    });
    setFieldErrors({});
    setMessage(null);
    setConnectionStatus({
      isConnected: false,
      isAuthenticated: false,
      user: null,
      error: null
    });
  };

  /**
   * 필드 라벨 반환
   */
  const getFieldLabel = (field: keyof FirebaseConfig): string => {
    const labels = {
      apiKey: 'API Key',
      authDomain: 'Auth Domain',
      databaseURL: 'Database URL',
      projectId: 'Project ID',
      storageBucket: 'Storage Bucket',
      messagingSenderId: 'Messaging Sender ID',
      appId: 'App ID'
    };
    return labels[field];
  };

  /**
   * 필드 플레이스홀더 반환
   */
  const getFieldPlaceholder = (field: keyof FirebaseConfig): string => {
    const placeholders = {
      apiKey: 'AIzaSyC...',
      authDomain: 'your-project.firebaseapp.com',
      databaseURL: 'https://your-project-default-rtdb.firebaseio.com/',
      projectId: 'your-project-id',
      storageBucket: 'your-project.appspot.com',
      messagingSenderId: '123456789',
      appId: '1:123456789:web:abcdef...'
    };
    return placeholders[field];
  };

  return (
    <Box maxW="600px" mx="auto" mt={8} p={6} borderWidth={1} borderRadius="lg" shadow="md">
      {/* 헤더 */}
      <VStack gap={6} align="stretch">
        <HStack justify="space-between" align="center">
          <Heading size="md">Firebase 프로젝트 연결</Heading>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowHelp(!showHelp)}
          >
            도움말
          </Button>
        </HStack>

        {/* 도움말 섹션 */}
        {showHelp && (
          <Box p={4} bg="blue.50" borderRadius="md" borderLeft="4px" borderColor="blue.400">
            <Text fontWeight="bold" mb={2} color="blue.800">Firebase 설정 방법</Text>
            <Text fontSize="sm" color="blue.700">
              Firebase Console에서 프로젝트 설정 → 일반 탭 → 앱 추가 → 웹 앱을 선택하여 
              설정 정보를 확인할 수 있습니다. Database URL은 Realtime Database 섹션에서 확인하세요.
            </Text>
          </Box>
        )}

        {/* 메시지 표시 */}
        {message && (
          <Box 
            p={4} 
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

        {/* 로딩 진행률 */}
        {isLoading && (
          <Box>
            <Text mb={2} fontSize="sm" color="gray.600">
              {isConnecting ? 'Firebase에 연결 중...' : '설정 확인 중...'}
            </Text>
            <Box w="100%" bg="gray.200" borderRadius="md" h="2">
              <Box 
                bg="blue.500" 
                h="100%" 
                borderRadius="md"
                animation="pulse 2s infinite"
                w="100%"
              />
            </Box>
          </Box>
        )}

        {/* 입력 폼 */}
        <VStack gap={4} align="stretch">
          {(Object.keys(formData) as Array<keyof FirebaseConfig>).map((field) => (
            <Box key={field}>
              <Text fontSize="sm" fontWeight="medium" mb={1}>
                {getFieldLabel(field)} *
              </Text>
              {field === 'databaseURL' ? (
                <Textarea
                  value={formData[field]}
                  onChange={(e) => handleInputChange(field, e.target.value)}
                  placeholder={getFieldPlaceholder(field)}
                  size="sm"
                  resize="none"
                  rows={2}
                  borderColor={fieldErrors[field] ? 'red.300' : undefined}
                />
              ) : (
                <Input
                  value={formData[field]}
                  onChange={(e) => handleInputChange(field, e.target.value)}
                  placeholder={getFieldPlaceholder(field)}
                  size="sm"
                  type={field === 'apiKey' ? 'password' : 'text'}
                  borderColor={fieldErrors[field] ? 'red.300' : undefined}
                />
              )}
              {fieldErrors[field] && (
                <Text fontSize="xs" color="red.500" mt={1}>
                  {fieldErrors[field]}
                </Text>
              )}
            </Box>
          ))}
        </VStack>

        {/* 액션 버튼 */}
        <HStack gap={3} justify="flex-end">
          <Button
            variant="outline"
            size="sm"
            onClick={loadFromEnvironment}
            disabled={isLoading}
          >
            환경변수에서 불러오기
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isLoading}
          >
            초기화
          </Button>
          <Button
            colorScheme="blue"
            size="sm"
            onClick={handleConnect}
            loading={isLoading}
            disabled={connectionStatus.isAuthenticated}
          >
            {isLoading ? '연결 중...' : connectionStatus.isAuthenticated ? '연결됨' : 'Firebase 연결'}
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default FirebaseSetup; 