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
  Heading,
  Textarea,
  Link
} from '@chakra-ui/react';
import { firebaseService, FirebaseConfig, ConnectionStatus } from '../services/FirebaseService';
import { localConfigService, LocalFirebaseConfig } from '../services/LocalConfigService';

interface FirebaseSetupProps {
  onConnectionSuccess: () => void;
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
  const loadFromEnvironment = (): boolean => {
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
        return true;
      } else {
        setMessage({ 
          type: 'error', 
          text: '환경변수에서 Firebase 설정을 찾을 수 없습니다. .env 파일을 확인해주세요.' 
        });
        return false;
      }
    } catch (error) {
      console.error('환경변수 로드 중 오류:', error);
      setMessage({ 
        type: 'error', 
        text: '환경변수 로드 중 오류가 발생했습니다.' 
      });
      return false;
    }
  };

  /**
   * localStorage에서 Firebase 설정 로드
   */
  const loadFromLocalStorage = () => {
    try {
      const savedConfig = localConfigService.loadFirebaseConfig();
      if (savedConfig && localConfigService.validateConfig(savedConfig)) {
        setFormData(savedConfig);
        setMessage({ 
          type: 'success', 
          text: '브라우저에 저장된 Firebase 설정을 불러왔습니다.' 
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('localStorage 로드 실패:', error);
      setMessage({ type: 'error', text: '저장된 설정 로드에 실패했습니다.' });
      return false;
    }
  };

  /**
   * Firebase 설정을 localStorage에 저장
   */
  const saveToLocalStorage = () => {
    try {
      if (!isFormValid()) {
        setMessage({ type: 'error', text: '모든 필드를 입력한 후 저장하세요.' });
        return;
      }

      localConfigService.saveFirebaseConfig(formData as LocalFirebaseConfig);
      setMessage({ 
        type: 'success', 
        text: 'Firebase 설정이 브라우저에 저장되었습니다! 다음부터 자동으로 로드됩니다.' 
      });
    } catch (error) {
      console.error('localStorage 저장 실패:', error);
      setMessage({ type: 'error', text: '설정 저장에 실패했습니다.' });
    }
  };

  // 컴포넌트 마운트 시 설정 자동 로드 및 자동 연결 시도
  useEffect(() => {
    // 1. 먼저 환경변수에서 로드 시도
    const envLoaded = loadFromEnvironment();
    
    // 2. 환경변수가 없으면 localStorage에서 로드
    if (!envLoaded) {
      const localLoaded = loadFromLocalStorage();
      if (!localLoaded) {
        setMessage({ 
          type: 'info', 
          text: 'Firebase 프로젝트 설정을 입력해주세요. 설정은 브라우저에 저장되어 다음부터 자동으로 로드됩니다.' 
        });
        return;
      }
    }

    // 3. 설정이 로드되었으면 자동으로 연결 시도
    setTimeout(() => {
      handleAutoConnect();
    }, 1000);
  }, []);

  // Firebase 연결 상태 변화 감지
  useEffect(() => {
    const handleStatusChange = (status: ConnectionStatus) => {
      setConnectionStatus(status);
      
      if (status.isConnected && status.isAuthenticated) {
        onConnectionSuccess();
      } else if (status.error) {
        onConnectionError(status.error);
      }
    };

    firebaseService.onConnectionStatusChanged(handleStatusChange);
    
    // 초기 상태 설정
    const currentStatus = firebaseService.getConnectionStatus();
    setConnectionStatus(currentStatus);

    return () => {
      firebaseService.offConnectionStatusChanged(handleStatusChange);
    };
  }, [onConnectionSuccess, onConnectionError]);

  /**
   * 폼 입력값 변경 처리
   */
  const handleInputChange = (field: keyof FirebaseConfig, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value.trim()
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
    let isValid = true;

    // 필수 필드 검증
    const requiredFields: (keyof FirebaseConfig)[] = [
      'apiKey', 'authDomain', 'databaseURL', 'projectId', 
      'storageBucket', 'messagingSenderId', 'appId'
    ];

    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].trim().length === 0) {
        errors[field] = `${getFieldLabel(field)}은(는) 필수 입력 항목입니다.`;
        isValid = false;
      }
    });

    setFieldErrors(errors);
    return isValid;
  };

  /**
   * 폼이 유효한지 확인
   */
  const isFormValid = (): boolean => {
    return Object.values(formData).every(value => value.trim().length > 0);
  };

  /**
   * 자동 연결 시도 (설정이 로드된 후)
   */
  const handleAutoConnect = async () => {
    if (!isFormValid()) {
      return;
    }

    setIsConnecting(true);
    setIsLoading(true);
    setMessage({ type: 'info', text: 'Firebase에 자동으로 연결 중...' });

    try {
      // Firebase 초기화
      const isInitialized = await firebaseService.initializeFirebase(formData);
      
      if (isInitialized) {
        // 익명 인증 수행
        await firebaseService.signInAnonymously();
        setMessage({ type: 'success', text: 'Firebase 연결 및 익명 인증이 완료되었습니다.' });

        // Firebase 연결 성공 시 자동으로 localStorage에 저장
        try {
          localConfigService.saveFirebaseConfig(formData as LocalFirebaseConfig);
          console.log('Firebase 설정이 자동으로 브라우저에 저장되었습니다.');
        } catch (saveError) {
          console.warn('Firebase 설정 자동 저장 실패:', saveError);
        }
      } else {
        throw new Error('Firebase 초기화에 실패했습니다.');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '연결에 실패했습니다.';
      console.error('Firebase 자동 연결 실패:', error);
      setMessage({ type: 'error', text: errorMessage });
      onConnectionError(errorMessage);
    } finally {
      setIsConnecting(false);
      setIsLoading(false);
    }
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
        setMessage({ type: 'success', text: 'Firebase 연결 및 익명 인증이 완료되었습니다.' });

        // Firebase 연결 성공 시 자동으로 localStorage에 저장
        try {
          localConfigService.saveFirebaseConfig(formData as LocalFirebaseConfig);
          console.log('Firebase 설정이 자동으로 브라우저에 저장되었습니다.');
        } catch (saveError) {
          console.warn('Firebase 설정 자동 저장 실패:', saveError);
        }
      } else {
        throw new Error('Firebase 초기화에 실패했습니다.');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '연결에 실패했습니다.';
      console.error('Firebase 연결 실패:', error);
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

        {/* Firebase 연결 상태 표시 */}
        <Box p={4} bg={connectionStatus.isConnected ? "green.50" : "blue.50"} borderRadius="md" borderLeft="4px" borderColor={connectionStatus.isConnected ? "green.400" : "blue.400"}>
          <Text fontWeight="bold" mb={2} color={connectionStatus.isConnected ? "green.800" : "blue.800"}>
            {connectionStatus.isConnected ? '✅ Firebase 연결 완료' : 'Firebase 프로젝트 연결'}
          </Text>
          <Text fontSize="sm" color={connectionStatus.isConnected ? "green.700" : "blue.700"}>
            {connectionStatus.isConnected 
              ? 'Firebase 프로젝트에 성공적으로 연결되었습니다. 이제 API 키를 설정할 수 있습니다.'
              : 'Firebase 프로젝트 설정을 입력하여 연결하세요.'
            }
          </Text>
        </Box>

        {/* 도움말 섹션 */}
        {showHelp && (
          <Box p={4} bg="blue.50" borderRadius="md" borderLeft="4px" borderColor="blue.400">
            <Text fontWeight="bold" mb={2} color="blue.800">
              Firebase 프로젝트 설정 방법
            </Text>
            <VStack align="start" gap={2}>
              <Text fontSize="sm" color="blue.700">
                1. <Link href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" color="blue.600" textDecoration="underline">Firebase Console</Link>에 접속하여 새 프로젝트를 생성합니다.
              </Text>
              <Text fontSize="sm" color="blue.700">
                2. 프로젝트 설정 → 일반 탭에서 "웹 앱 추가"를 클릭합니다.
              </Text>
              <Text fontSize="sm" color="blue.700">
                3. 앱 등록 후 표시되는 설정 정보를 아래 폼에 입력합니다.
              </Text>
              <Text fontSize="sm" color="blue.700">
                4. <Text as="span" fontWeight="bold" color="red.600">중요:</Text> Authentication → Sign-in method에서 <Text as="span" fontWeight="bold">"익명"</Text> 인증을 활성화하세요.
              </Text>
              <Text fontSize="sm" color="blue.700">
                5. Realtime Database를 활성화하고 보안 규칙을 설정합니다.
              </Text>
            </VStack>
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

        {/* Firebase 설정 입력 폼 - Firebase 연결이 안된 경우 표시 */}
        {!connectionStatus.isConnected && (
          <VStack gap={4} align="stretch">
            <Text fontSize="md" fontWeight="bold" color="gray.800">
              Firebase 프로젝트 설정
            </Text>
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
        )}

        {/* 액션 버튼 - Firebase 연결이 안된 경우 표시 */}
        {!connectionStatus.isConnected && (
          <VStack gap={3} align="stretch">
            <HStack gap={2} justify="flex-end">
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
                onClick={loadFromLocalStorage}
                disabled={isLoading}
              >
                저장된 설정 불러오기
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isLoading}
              >
                초기화
              </Button>
            </HStack>
            <HStack gap={2} justify="flex-end">
              <Button
                variant="outline"
                colorScheme="green"
                size="sm"
                onClick={saveToLocalStorage}
                disabled={isLoading || !isFormValid()}
              >
                브라우저에 저장
              </Button>
              <Button
                colorScheme="blue"
                size="sm"
                onClick={handleConnect}
                disabled={isLoading || !isFormValid()}
              >
                {isLoading ? '연결 중...' : 'Firebase 연결'}
              </Button>
            </HStack>
          </VStack>
        )}
      </VStack>
    </Box>
  );
};

export default FirebaseSetup; 