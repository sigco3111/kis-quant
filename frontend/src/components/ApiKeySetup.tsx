import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Heading,
  Spinner
} from '@chakra-ui/react';
import { apiKeyService, ApiKeyData } from '../services/ApiKeyService';

/**
 * API 키 설정 컴포넌트
 * 한국투자증권 API 키를 안전하게 입력, 저장, 관리하는 컴포넌트
 */
export const ApiKeySetup: React.FC = () => {
  // 폼 상태
  const [formData, setFormData] = useState({
    appKey: '',
    appSecret: '',
    accountNumber: '',
    password: ''
  });

  // UI 상태
  const [isLoading, setIsLoading] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [existingKeys, setExistingKeys] = useState<ApiKeyData | null>(null);
  const [hasStoredKeys, setHasStoredKeys] = useState(false);
  const [loadPassword, setLoadPassword] = useState('');
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  /**
   * 컴포넌트 마운트 시 저장된 키 확인
   */
  useEffect(() => {
    checkStoredKeys();
  }, []);

  /**
   * 저장된 키 존재 여부 확인
   */
  const checkStoredKeys = () => {
    const hasKeys = apiKeyService.hasStoredApiKeys();
    setHasStoredKeys(hasKeys);
    
    if (hasKeys) {
      const keyInfo = apiKeyService.getStoredApiKeyInfo();
      if (keyInfo) {
        setMessage({ 
          type: 'info', 
          text: `저장된 API 키가 있습니다. (저장일: ${new Date(keyInfo.createdAt).toLocaleDateString()})` 
        });
      }
    }
  };

  /**
   * 입력값 변경 처리
   */
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 메시지 초기화
    if (message) {
      setMessage(null);
    }
  };

  /**
   * 폼 유효성 검증
   */
  const validateForm = (): boolean => {
    if (!formData.appKey.trim()) {
      setMessage({ type: 'error', text: 'App Key를 입력해주세요.' });
      return false;
    }

    if (!formData.appSecret.trim()) {
      setMessage({ type: 'error', text: 'App Secret을 입력해주세요.' });
      return false;
    }

    if (!formData.accountNumber.trim()) {
      setMessage({ type: 'error', text: '계좌번호를 입력해주세요.' });
      return false;
    }

    if (!formData.password.trim()) {
      setMessage({ type: 'error', text: '암호화에 사용할 비밀번호를 입력해주세요.' });
      return false;
    }

    if (formData.password.length < 4) {
      setMessage({ type: 'error', text: '비밀번호는 최소 4자 이상이어야 합니다.' });
      return false;
    }

    return true;
  };

  /**
   * API 키 저장
   */
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const apiKeyData: ApiKeyData = {
        appKey: formData.appKey.trim(),
        appSecret: formData.appSecret.trim(),
        accountNumber: formData.accountNumber.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await apiKeyService.saveApiKeys(apiKeyData, formData.password);

      setMessage({ type: 'success', text: 'API 키가 안전하게 저장되었습니다!' });
      
      // 폼 초기화
      setFormData({
        appKey: '',
        appSecret: '',
        accountNumber: '',
        password: ''
      });

      // 저장된 키 상태 업데이트
      checkStoredKeys();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '저장에 실패했습니다.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 저장된 API 키 로드
   */
  const handleLoad = async () => {
    if (!loadPassword.trim()) {
      setMessage({ type: 'error', text: '비밀번호를 입력해주세요.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const apiKeyData = await apiKeyService.loadApiKeys(loadPassword);
      
      if (apiKeyData) {
        setExistingKeys(apiKeyData);
        setMessage({ 
          type: 'success', 
          text: '저장된 API 키를 성공적으로 로드했습니다!' 
        });
      } else {
        setMessage({ type: 'error', text: '저장된 API 키를 찾을 수 없습니다.' });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '로드에 실패했습니다.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
      setLoadPassword('');
      setShowLoadModal(false);
    }
  };

  /**
   * API 키 삭제
   */
  const handleDelete = () => {
    try {
      apiKeyService.deleteApiKeys();
      setMessage({ type: 'success', text: '저장된 API 키가 삭제되었습니다.' });
      setExistingKeys(null);
      checkStoredKeys();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '삭제에 실패했습니다.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setShowDeleteModal(false);
    }
  };

  /**
   * 편집을 위한 기존 키 로드
   */
  const handleEditLoad = () => {
    if (existingKeys) {
      setFormData({
        appKey: existingKeys.appKey,
        appSecret: existingKeys.appSecret,
        accountNumber: existingKeys.accountNumber,
        password: ''
      });
      setMessage({ type: 'info', text: '기존 API 키를 편집 모드로 로드했습니다. 비밀번호를 입력하고 저장하세요.' });
    }
  };

  return (
    <Box maxW="600px" mx="auto" mt={8} p={6} borderWidth={1} borderRadius="lg" shadow="md">
      <VStack gap={6} align="stretch">
        {/* 헤더 */}
        <Heading size="md">한국투자증권 API 키 설정</Heading>

        {/* 저장된 키 정보 표시 */}
        {existingKeys && (
          <Box p={4} bg="green.50" borderRadius="md" borderLeft="4px" borderColor="green.400">
            <Text fontWeight="bold" color="green.800" mb={2}>
              ✅ 저장된 API 키 정보
            </Text>
            <VStack align="start" gap={1}>
              <Text fontSize="sm" color="green.700">
                계좌번호: {existingKeys.accountNumber}
              </Text>
              <Text fontSize="sm" color="green.700">
                저장일: {new Date(existingKeys.createdAt).toLocaleString()}
              </Text>
              <Text fontSize="sm" color="green.700">
                수정일: {new Date(existingKeys.updatedAt).toLocaleString()}
              </Text>
            </VStack>
            <HStack mt={3} gap={2}>
              <Button size="sm" colorScheme="blue" onClick={handleEditLoad}>
                편집
              </Button>
              <Button size="sm" colorScheme="red" variant="outline" onClick={() => setShowDeleteModal(true)}>
                삭제
              </Button>
            </HStack>
          </Box>
        )}

        {/* 저장된 키 로드 버튼 */}
        {hasStoredKeys && !existingKeys && (
          <Box p={4} bg="blue.50" borderRadius="md" borderLeft="4px" borderColor="blue.400">
            <Text fontWeight="bold" color="blue.800" mb={2}>
              💾 저장된 API 키 발견
            </Text>
            <Text fontSize="sm" color="blue.700" mb={3}>
              이전에 저장한 API 키가 있습니다. 비밀번호를 입력하여 로드할 수 있습니다.
            </Text>
            <Button size="sm" colorScheme="blue" onClick={() => setShowLoadModal(true)}>
              저장된 키 로드
            </Button>
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

        {/* API 키 입력 폼 */}
        <VStack gap={4} align="stretch">
          <Text fontSize="md" fontWeight="bold" color="gray.800">
            API 키 정보 입력
          </Text>

          {/* App Key */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>
              App Key *
            </Text>
            <HStack>
              <Input
                type={showSecrets ? 'text' : 'password'}
                value={formData.appKey}
                onChange={(e) => handleInputChange('appKey', e.target.value)}
                placeholder="한국투자증권에서 발급받은 App Key"
                size="sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSecrets(!showSecrets)}
              >
                {showSecrets ? '숨기기' : '보기'}
              </Button>
            </HStack>
          </Box>

          {/* App Secret */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>
              App Secret *
            </Text>
            <Input
              type={showSecrets ? 'text' : 'password'}
              value={formData.appSecret}
              onChange={(e) => handleInputChange('appSecret', e.target.value)}
              placeholder="한국투자증권에서 발급받은 App Secret"
              size="sm"
            />
          </Box>

          {/* 계좌번호 */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>
              계좌번호 *
            </Text>
            <Input
              type="text"
              value={formData.accountNumber}
              onChange={(e) => handleInputChange('accountNumber', e.target.value)}
              placeholder="8자리 계좌번호 (예: 12345678)"
              size="sm"
              maxLength={8}
            />
            <Text fontSize="xs" color="gray.500" mt={1}>
              계좌번호는 8자리 숫자만 입력하세요.
            </Text>
          </Box>

          {/* 암호화 비밀번호 */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>
              암호화 비밀번호 *
            </Text>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="API 키 암호화에 사용할 비밀번호 (최소 4자)"
              size="sm"
            />
            <Text fontSize="xs" color="red.500" mt={1}>
              ⚠️ 이 비밀번호를 잊어버리면 저장된 API 키를 복구할 수 없습니다.
            </Text>
          </Box>
        </VStack>

        {/* 액션 버튼 */}
        <HStack justify="flex-end" gap={2}>
          <Button
            colorScheme="blue"
            onClick={handleSave}
            disabled={isLoading}
            size="sm"
          >
            {isLoading ? <Spinner size="sm" mr={2} /> : null}
            {existingKeys ? 'API 키 업데이트' : 'API 키 저장'}
          </Button>
        </HStack>

        {/* 안내 사항 */}
        <Box p={4} bg="yellow.50" borderRadius="md" borderLeft="4px" borderColor="yellow.400">
          <Text fontWeight="bold" color="yellow.800" mb={2}>
            📋 안내사항
          </Text>
          <VStack align="start" gap={1}>
            <Text fontSize="sm" color="yellow.700">
              • API 키는 AES-256-CBC 암호화로 브라우저에 안전하게 저장됩니다.
            </Text>
            <Text fontSize="sm" color="yellow.700">
              • 비밀번호는 서버에 전송되지 않으며, 로컬에서만 사용됩니다.
            </Text>
            <Text fontSize="sm" color="yellow.700">
              • 브라우저 데이터를 삭제하면 저장된 API 키도 함께 삭제됩니다.
            </Text>
          </VStack>
        </Box>
      </VStack>

      {/* 저장된 키 로드 모달 */}
      {showLoadModal && (
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="blackAlpha.600"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex="1000"
        >
          <Box bg="white" p={6} borderRadius="md" maxW="400px" w="90%">
            <Text fontSize="lg" fontWeight="bold" mb={4}>
              저장된 API 키 로드
            </Text>
            <Text mb={4}>
              저장된 API 키를 로드하려면 암호화에 사용한 비밀번호를 입력하세요.
            </Text>
            <Input
              type="password"
              placeholder="암호화 비밀번호"
              value={loadPassword}
              onChange={(e) => setLoadPassword(e.target.value)}
              mb={4}
            />
            <HStack justify="flex-end" gap={2}>
              <Button variant="ghost" onClick={() => setShowLoadModal(false)}>
                취소
              </Button>
              <Button 
                colorScheme="blue" 
                onClick={handleLoad}
                disabled={isLoading || !loadPassword.trim()}
              >
                {isLoading ? <Spinner size="sm" mr={2} /> : null}
                로드
              </Button>
            </HStack>
          </Box>
        </Box>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="blackAlpha.600"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex="1000"
        >
          <Box bg="white" p={6} borderRadius="md" maxW="400px" w="90%">
            <Text fontSize="lg" fontWeight="bold" mb={4}>
              API 키 삭제
            </Text>
            <Text mb={4}>
              저장된 API 키를 정말 삭제하시겠습니까? 
              이 작업은 되돌릴 수 없습니다.
            </Text>
            <HStack justify="flex-end" gap={2}>
              <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
                취소
              </Button>
              <Button colorScheme="red" onClick={handleDelete}>
                삭제
              </Button>
            </HStack>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ApiKeySetup; 