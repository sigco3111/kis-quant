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
import { googleAuthService, GoogleUser } from '../services/GoogleAuthService';
import { userConfigService } from '../services/UserConfigService';
import { localConfigService, LocalFirebaseConfig } from '../services/LocalConfigService';
import GoogleLogin from './GoogleLogin';

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
  const [currentUser, setCurrentUser] = useState<GoogleUser | null>(null);
  const [hasStoredConfig, setHasStoredConfig] = useState(false);
  const [userPassword, setUserPassword] = useState('');

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

  // 컴포넌트 마운트 시 설정 자동 로드 (환경변수 → localStorage 순서)
  useEffect(() => {
    // 1. 먼저 환경변수에서 로드 시도
    const envLoaded = loadFromEnvironment();
    
    // 2. 환경변수가 없으면 localStorage에서 로드
    if (!envLoaded) {
      setTimeout(() => {
        const localLoaded = loadFromLocalStorage();
        if (!localLoaded) {
          setMessage({ 
            type: 'info', 
            text: 'Firebase 프로젝트 설정을 입력해주세요. 설정은 브라우저에 저장되어 다음부터 자동으로 로드됩니다.' 
          });
        }
      }, 500);
    }
  }, []);

  /**
   * Google 로그인 성공 처리
   * @param user 로그인한 사용자 정보
   */
  const handleLoginSuccess = async (user: GoogleUser) => {
    setCurrentUser(user);
    setMessage({ type: 'success', text: `${user.displayName}님, 환영합니다!` });

    // 저장된 설정이 있는지 확인
    try {
      const hasConfig = await userConfigService.hasUserFirebaseConfig(user.uid);
      setHasStoredConfig(hasConfig);

      if (hasConfig) {
        setMessage({ 
          type: 'info', 
          text: '저장된 Firebase 설정이 있습니다. 비밀번호를 입력하여 자동으로 로드할 수 있습니다.' 
        });
      }
    } catch (error) {
      console.error('저장된 설정 확인 실패:', error);
    }
  };

  /**
   * Google 로그인 에러 처리
   * @param error 에러 메시지
   */
  const handleLoginError = (error: string) => {
    setMessage({ type: 'error', text: error });
  };

  /**
   * 저장된 Firebase 설정 로드
   */
  const loadStoredConfig = async () => {
    if (!currentUser || !userPassword.trim()) {
      setMessage({ type: 'error', text: '비밀번호를 입력해주세요.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const userConfig = await userConfigService.loadUserFirebaseConfig(
        currentUser.uid,
        userPassword
      );

      if (userConfig) {
        // 폼에 설정값 로드
        setFormData(userConfig.firebaseConfig);
        setMessage({ 
          type: 'success', 
          text: '저장된 Firebase 설정을 성공적으로 로드했습니다!' 
        });

        // 저장된 설정으로 Firebase 자동 연결 시도
        await handleConnectWithConfig(userConfig.firebaseConfig);
      } else {
        setMessage({ type: 'error', text: '저장된 설정을 찾을 수 없습니다.' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '설정 로드에 실패했습니다.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Firebase 설정 저장
   */
  const saveFirebaseConfig = async () => {
    if (!currentUser) {
      setMessage({ type: 'error', text: '먼저 Google 로그인을 해주세요.' });
      return;
    }

    if (!userPassword.trim()) {
      setMessage({ type: 'error', text: '설정 저장을 위한 비밀번호를 입력해주세요.' });
      return;
    }

    if (!connectionStatus.isConnected) {
      setMessage({ type: 'error', text: '먼저 Firebase에 연결한 후 설정을 저장하세요.' });
      return;
    }

    setIsLoading(true);

    try {
      await userConfigService.saveUserFirebaseConfig(
        currentUser.uid,
        formData,
        userPassword
      );

      // 사용자 프로필 정보도 저장
      await userConfigService.saveUserProfile(currentUser.uid, {
        email: currentUser.email,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        lastLogin: Date.now()
      });

      setHasStoredConfig(true);
      setMessage({ 
        type: 'success', 
        text: 'Firebase 설정이 안전하게 저장되었습니다!' 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '설정 저장에 실패했습니다.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

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
   * 폼 유효성 확인 (에러 설정 없이)
   */
  const isFormValid = (): boolean => {
    return Object.values(formData).every(value => value.trim() !== '');
  };

  /**
   * 특정 설정으로 Firebase 연결
   * @param config Firebase 설정
   */
  const handleConnectWithConfig = async (config: FirebaseConfig) => {
    setIsConnecting(true);
    setIsLoading(true);
    setMessage(null);

    try {
      // Firebase 초기화
      const isInitialized = await firebaseService.initializeFirebase(config);
      
      if (isInitialized) {
        // 구글 로그인 사용자가 있는 경우 익명 인증을 건너뜀
        if (currentUser) {
          console.log('Google 로그인 사용자 감지, 자동 연결 완료');
          setMessage({ type: 'success', text: 'Firebase 자동 연결이 완료되었습니다.' });
          
          // GoogleAuthService에 새로운 Firebase Auth 인스턴스 설정
          const auth = firebaseService.getAuth();
          if (auth) {
            googleAuthService.setAuth(auth);
          }
        } else {
          // 구글 로그인이 없는 경우에만 익명 인증 수행
          await firebaseService.signInAnonymously();
          setMessage({ type: 'success', text: 'Firebase 연결 및 익명 인증이 완료되었습니다.' });
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
        // 구글 로그인 사용자가 있는 경우 익명 인증을 건너뜀
        if (currentUser) {
          console.log('Google 로그인 사용자 감지, 익명 인증 건너뜀');
          setMessage({ type: 'success', text: 'Firebase 연결이 완료되었습니다.' });
          
          // GoogleAuthService에 새로운 Firebase Auth 인스턴스 설정
          const auth = firebaseService.getAuth();
          if (auth) {
            googleAuthService.setAuth(auth);
          }
        } else {
          // 구글 로그인이 없는 경우에만 익명 인증 수행
          await firebaseService.signInAnonymously();
          setMessage({ type: 'success', text: 'Firebase 연결 및 익명 인증이 완료되었습니다.' });
        }

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
            {connectionStatus.isConnected ? '✅ Firebase 연결 완료' : '1단계: Firebase 연결'}
          </Text>
          <Text fontSize="sm" color={connectionStatus.isConnected ? "green.700" : "blue.700"}>
            {connectionStatus.isConnected 
              ? 'Firebase 프로젝트에 성공적으로 연결되었습니다.'
              : 'Firebase 프로젝트 설정을 입력하여 연결하세요.'
            }
          </Text>
        </Box>

        {/* Google 로그인 섹션 - Firebase 연결 후 활성화 */}
        {!currentUser ? (
          <Box p={4} bg={connectionStatus.isConnected ? "blue.50" : "gray.50"} borderRadius="md" borderLeft="4px" borderColor={connectionStatus.isConnected ? "blue.400" : "gray.400"}>
            <Text fontWeight="bold" mb={2} color={connectionStatus.isConnected ? "blue.800" : "gray.600"}>
              2단계: Google 로그인
            </Text>
            <Text fontSize="sm" color={connectionStatus.isConnected ? "blue.700" : "gray.600"} mb={3}>
              Google 계정으로 로그인하여 Firebase 설정을 안전하게 저장하고 관리하세요.
            </Text>
            <GoogleLogin 
              onLoginSuccess={handleLoginSuccess}
              onLoginError={handleLoginError}
              disabled={!connectionStatus.isConnected}
              disabledMessage="Firebase 프로젝트 연결을 먼저 완료해주세요."
            />
          </Box>
        ) : (
          <Box p={4} bg="green.50" borderRadius="md" borderLeft="4px" borderColor="green.400">
            <HStack justify="space-between" align="center">
              <VStack align="start" gap={1}>
                <Text fontWeight="bold" color="green.800">
                  ✅ {currentUser.displayName}님 로그인 완료
                </Text>
                <Text fontSize="sm" color="green.700">
                  {currentUser.email}
                </Text>
              </VStack>
              <Button
                size="sm"
                variant="outline"
                colorScheme="red"
                onClick={() => googleAuthService.signOut()}
              >
                로그아웃
              </Button>
            </HStack>
            
            {/* 저장된 설정 로드 섹션 */}
            {hasStoredConfig && !connectionStatus.isConnected && (
              <Box mt={4} p={3} bg="blue.50" borderRadius="md">
                <Text fontWeight="bold" color="blue.800" mb={2}>
                  💾 저장된 Firebase 설정 발견
                </Text>
                <Text fontSize="sm" color="blue.700" mb={3}>
                  이전에 저장한 Firebase 설정을 불러와서 자동으로 연결할 수 있습니다.
                </Text>
                <HStack gap={2}>
                  <Input
                    type="password"
                    placeholder="설정 암호화에 사용한 비밀번호"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    size="sm"
                    flex={1}
                  />
                  <Button
                    size="sm"
                    colorScheme="blue"
                    onClick={loadStoredConfig}
                    disabled={isLoading || !userPassword.trim()}
                  >
                    자동 연결
                  </Button>
                </HStack>
              </Box>
            )}
          </Box>
        )}



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

        {/* Firebase 설정 저장 섹션 */}
        {currentUser && connectionStatus.isConnected && (
          <Box p={4} bg="yellow.50" borderRadius="md" borderLeft="4px" borderColor="yellow.400">
            <Text fontWeight="bold" color="yellow.800" mb={2}>
              💾 Firebase 설정 저장
            </Text>
            <Text fontSize="sm" color="yellow.700" mb={3}>
              현재 Firebase 설정을 암호화하여 저장하면, 다음번 로그인 시 자동으로 연결됩니다.
            </Text>
            <HStack gap={2}>
              <Input
                type="password"
                placeholder="설정 암호화에 사용할 비밀번호"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                size="sm"
                flex={1}
              />
              <Button
                size="sm"
                colorScheme="green"
                onClick={saveFirebaseConfig}
                disabled={isLoading || !userPassword.trim()}
              >
                {hasStoredConfig ? '설정 업데이트' : '설정 저장'}
              </Button>
            </HStack>
            <Text fontSize="xs" color="yellow.600" mt={2}>
              ⚠️ 비밀번호를 잊어버리면 저장된 설정을 복구할 수 없습니다.
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default FirebaseSetup; 