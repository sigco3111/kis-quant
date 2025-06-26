import React, { useState, useEffect } from 'react';
import { ApiKeyService, ApiKeyData, ApiKeyValidationResult } from '../services/ApiKeyService';

/**
 * API 키 설정 컴포넌트의 상태 인터페이스
 */
interface ApiKeySetupState {
  appKey: string;
  appSecret: string;
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;
  validationResult: ApiKeyValidationResult | null;
  showSecrets: boolean;
  existingKeys: ApiKeyData | null;
  showDeleteModal: boolean;
}

/**
 * 한국투자증권 API 키 입력 및 관리 컴포넌트
 * 사용자가 API 키를 안전하게 입력, 저장, 수정, 삭제할 수 있는 인터페이스 제공
 */
export const ApiKeySetup: React.FC = () => {
  const [state, setState] = useState<ApiKeySetupState>({
    appKey: '',
    appSecret: '',
    isLoading: false,
    isValidating: false,
    error: null,
    validationResult: null,
    showSecrets: false,
    existingKeys: null,
    showDeleteModal: false
  });

  /**
   * 알림 메시지 표시
   */
  const showNotification = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    // 간단한 알림 구현 (실제 토스트 라이브러리 대신)
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      background-color: ${type === 'success' ? '#38a169' : type === 'error' ? '#e53e3e' : '#d69e2e'};
    `;
    document.body.appendChild(notification);
    setTimeout(() => document.body.removeChild(notification), 5000);
  };

  /**
   * 컴포넌트 마운트 시 기존 API 키 확인
   */
  useEffect(() => {
    loadExistingKeys();
  }, []);

  /**
   * 기존 저장된 API 키 불러오기
   */
  const loadExistingKeys = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const hasKeys = await ApiKeyService.hasApiKeys();
      if (hasKeys) {
        const existingKeys = await ApiKeyService.getApiKeys();
        setState(prev => ({ 
          ...prev, 
          existingKeys,
          isLoading: false 
        }));
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isLoading: false 
      }));
      
      showNotification(errorMessage, 'error');
    }
  };

  /**
   * 입력 필드 값 변경 처리
   */
  const handleInputChange = (field: 'appKey' | 'appSecret', value: string) => {
    setState(prev => ({
      ...prev,
      [field]: value,
      error: null,
      validationResult: null
    }));
  };

  /**
   * API 키 유효성 검증
   */
  const validateApiKeys = async () => {
    if (!state.appKey.trim() || !state.appSecret.trim()) {
      setState(prev => ({
        ...prev,
        error: 'App Key와 App Secret을 모두 입력해주세요.'
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isValidating: true, error: null }));

      const apiKeyData: ApiKeyData = {
        appKey: state.appKey.trim(),
        appSecret: state.appSecret.trim(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await ApiKeyService.validateApiKeys(apiKeyData);
      setState(prev => ({ 
        ...prev, 
        validationResult: result,
        isValidating: false 
      }));

      showNotification(result.message, result.isValid ? 'success' : 'error');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '검증 중 오류가 발생했습니다.';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isValidating: false 
      }));
      showNotification(errorMessage, 'error');
    }
  };

  /**
   * API 키 저장
   */
  const saveApiKeys = async () => {
    if (!state.validationResult?.isValid) {
      showNotification('API 키를 먼저 검증해주세요.', 'warning');
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const apiKeyData: ApiKeyData = {
        appKey: state.appKey.trim(),
        appSecret: state.appSecret.trim(),
        createdAt: state.existingKeys?.createdAt || new Date(),
        updatedAt: new Date()
      };

      await ApiKeyService.saveApiKeys(apiKeyData);
      
      // 저장 후 기존 키 다시 로드
      await loadExistingKeys();
      
      // 입력 필드 초기화
      setState(prev => ({
        ...prev,
        appKey: '',
        appSecret: '',
        validationResult: null,
        isLoading: false
      }));

      showNotification('API 키가 안전하게 저장되었습니다.', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isLoading: false 
      }));
      
      showNotification(errorMessage, 'error');
    }
  };

  /**
   * API 키 삭제
   */
  const deleteApiKeys = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await ApiKeyService.deleteApiKeys();
      
      setState(prev => ({
        ...prev,
        existingKeys: null,
        showDeleteModal: false,
        isLoading: false
      }));

      showNotification('API 키가 삭제되었습니다.', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isLoading: false 
      }));
      
      showNotification(errorMessage, 'error');
    }
  };

  /**
   * 기존 API 키를 편집 폼에 로드
   */
  const loadForEdit = async () => {
    if (!state.existingKeys) return;
    
    try {
      const keys = await ApiKeyService.getApiKeys();
      if (keys) {
        setState(prev => ({
          ...prev,
          appKey: keys.appKey,
          appSecret: keys.appSecret,
          validationResult: null
        }));
      }
    } catch (error) {
      showNotification('기존 키를 불러올 수 없습니다.', 'error');
    }
  };

  // 로딩 스피너
  if (state.isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px',
        fontSize: '16px'
      }}>
        <div>로딩 중...</div>
      </div>
    );
  }

  // 스타일 정의
  const containerStyle: React.CSSProperties = {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px'
  };

  const cardStyle: React.CSSProperties = {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    backgroundColor: '#ffffff'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '10px'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 24px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginRight: '10px'
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#3182ce',
    color: 'white'
  };

  const successButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#38a169',
    color: 'white'
  };

  const dangerButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#e53e3e',
    color: 'white'
  };

  const alertStyle: React.CSSProperties = {
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    border: '1px solid'
  };

  const errorAlertStyle: React.CSSProperties = {
    ...alertStyle,
    backgroundColor: '#fed7d7',
    borderColor: '#e53e3e',
    color: '#c53030'
  };

  const successAlertStyle: React.CSSProperties = {
    ...alertStyle,
    backgroundColor: '#c6f6d5',
    borderColor: '#38a169',
    color: '#2f855a'
  };

  return (
    <div style={containerStyle}>
      {/* 기존 API 키 정보 카드 */}
      {state.existingKeys && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>저장된 API 키</h3>
            <div>
              <span style={{ 
                backgroundColor: '#38a169', 
                color: 'white', 
                padding: '4px 8px', 
                borderRadius: '4px', 
                fontSize: '12px',
                marginRight: '10px'
              }}>
                활성
              </span>
              <button
                onClick={loadForEdit}
                style={{ ...buttonStyle, backgroundColor: '#3182ce', color: 'white', marginRight: '5px' }}
              >
                편집
              </button>
              <button
                onClick={() => setState(prev => ({ ...prev, showDeleteModal: true }))}
                style={dangerButtonStyle}
              >
                삭제
              </button>
            </div>
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>생성일:</strong> {state.existingKeys.createdAt.toLocaleDateString()}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>수정일:</strong> {state.existingKeys.updatedAt.toLocaleDateString()}
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              API 키는 암호화되어 안전하게 저장됩니다.
            </div>
          </div>
        </div>
      )}

      {/* API 키 입력 카드 */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold' }}>
          {state.existingKeys ? 'API 키 업데이트' : 'API 키 설정'}
        </h3>

        {/* 오류 메시지 */}
        {state.error && (
          <div style={errorAlertStyle}>
            {state.error}
          </div>
        )}

        {/* 검증 결과 */}
        {state.validationResult && (
          <div style={state.validationResult.isValid ? successAlertStyle : errorAlertStyle}>
            {state.validationResult.message}
          </div>
        )}

        {/* App Key 입력 */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            App Key *
          </label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type={state.showSecrets ? 'text' : 'password'}
              value={state.appKey}
              onChange={(e) => handleInputChange('appKey', e.target.value)}
              placeholder="한국투자증권 App Key를 입력하세요"
              style={{ ...inputStyle, marginBottom: 0, marginRight: '10px' }}
            />
            <button
              onClick={() => setState(prev => ({ ...prev, showSecrets: !prev.showSecrets }))}
              style={{ ...buttonStyle, padding: '12px', backgroundColor: '#f7fafc', border: '1px solid #e2e8f0' }}
            >
              {state.showSecrets ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* App Secret 입력 */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            App Secret *
          </label>
          <input
            type={state.showSecrets ? 'text' : 'password'}
            value={state.appSecret}
            onChange={(e) => handleInputChange('appSecret', e.target.value)}
            placeholder="한국투자증권 App Secret을 입력하세요"
            style={inputStyle}
          />
        </div>

        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

        {/* 버튼들 */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button
            onClick={validateApiKeys}
            disabled={state.isValidating || !state.appKey.trim() || !state.appSecret.trim()}
            style={primaryButtonStyle}
          >
            {state.isValidating ? '검증 중...' : 'API 키 검증'}
          </button>
          <button
            onClick={saveApiKeys}
            disabled={state.isLoading || !state.validationResult?.isValid}
            style={successButtonStyle}
          >
            {state.isLoading ? '저장 중...' : (state.existingKeys ? '업데이트' : '저장')}
          </button>
        </div>

        <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
          API 키는 AES-256 암호화로 보호되며, 사용자의 Firebase DB에만 저장됩니다.
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {state.showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 15px 0' }}>API 키 삭제 확인</h3>
            <p style={{ marginBottom: '25px' }}>
              저장된 API 키를 삭제하시겠습니까? 
              이 작업은 되돌릴 수 없으며, 모든 자동매매가 중단됩니다.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setState(prev => ({ ...prev, showDeleteModal: false }))}
                style={{ ...buttonStyle, backgroundColor: '#f7fafc', border: '1px solid #e2e8f0' }}
              >
                취소
              </button>
              <button
                onClick={deleteApiKeys}
                disabled={state.isLoading}
                style={dangerButtonStyle}
              >
                {state.isLoading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 