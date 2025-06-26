/**
 * 백테스트 실행 컴포넌트
 * 전략에 대한 백테스트를 실행하고 진행률을 표시합니다.
 */

import React, { useState, useCallback } from 'react';
import {
  Strategy,
  BacktestConfig,
  BacktestRequest,
  BacktestResponse,
  BacktestResult,
  BacktestProgress
} from '../types/Strategy';

interface BacktestRunnerProps {
  strategy: Strategy;
  onBacktestComplete: (result: BacktestResult) => void;
  onClose: () => void;
}

/**
 * 백테스트 실행 컴포넌트
 */
const BacktestRunner: React.FC<BacktestRunnerProps> = ({
  strategy,
  onBacktestComplete,
  onClose
}) => {
  // 백테스트 설정 상태
  const [config, setConfig] = useState<BacktestConfig>({
    strategyId: strategy.id,
    startDate: Date.now() - (365 * 24 * 60 * 60 * 1000), // 1년 전
    endDate: Date.now(),
    initialCapital: 10000000, // 1천만원
    commission: 0.015, // 0.015%
    slippage: 0.05 // 0.05%
  });
  
  // 백테스트 실행 상태
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<BacktestProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useComplexEngine, setUseComplexEngine] = useState(false);

  /**
   * 백테스트 설정 업데이트
   */
  const updateConfig = useCallback((field: keyof BacktestConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  /**
   * 날짜 포맷팅 (YYYY-MM-DD)
   */
  const formatDateForInput = (timestamp: number): string => {
    return new Date(timestamp).toISOString().split('T')[0];
  };

  /**
   * 날짜 파싱 (YYYY-MM-DD -> timestamp)
   */
  const parseDateFromInput = (dateString: string): number => {
    return new Date(dateString).getTime();
  };

  /**
   * 백테스트 실행
   */
  const runBacktest = async () => {
    try {
      setIsRunning(true);
      setError(null);
      setProgress({
        id: `progress_${Date.now()}`,
        status: 'pending',
        progress: 0,
        message: '백테스트 준비 중...'
      });

      // 백테스트 요청 구성
      const request: BacktestRequest = {
        strategy,
        config,
        useComplexEngine
      };

      // API 엔드포인트 결정
      const endpoint = useComplexEngine 
        ? '/api/backtest/complex' // Python 엔진 (아직 구현되지 않음)
        : '/api/backtest/simple';  // Vercel Functions

      // 백테스트 실행 요청
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: BacktestResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || '백테스트 실행 중 오류가 발생했습니다.');
      }

      if (result.result) {
        // 백테스트 완료
        setProgress({
          id: `progress_${Date.now()}`,
          status: 'completed',
          progress: 100,
          message: '백테스트 완료!'
        });

        // 성공 알림 표시 (간단한 alert 사용)
        alert(`백테스트 완료!\n총 수익률: ${result.result.totalReturn.toFixed(2)}%`);

        onBacktestComplete(result.result);
      }

    } catch (error) {
      console.error('백테스트 실행 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      
      setError(errorMessage);
      setProgress({
        id: `progress_${Date.now()}`,
        status: 'failed',
        progress: 0,
        message: `오류: ${errorMessage}`
      });

      // 오류 알림 표시
      alert(`백테스트 실행 실패\n${errorMessage}`);

    } finally {
      setIsRunning(false);
    }
  };

  /**
   * 금액 포맷팅
   */
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: '#2D3748',
          margin: '0 0 8px 0'
        }}>
          📊 백테스트 실행
        </h2>
        <p style={{ 
          fontSize: '14px', 
          color: '#718096',
          margin: '0'
        }}>
          전략: {strategy.name}
        </p>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '24px 0' }} />

      {/* 백테스트 설정 */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          color: '#2D3748',
          margin: '0 0 16px 0'
        }}>
          백테스트 설정
        </h3>

        {/* 기간 설정 */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '16px',
          marginBottom: '16px'
        }}>
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500',
              marginBottom: '4px',
              color: '#4A5568'
            }}>
              시작일
            </label>
            <input
              type="date"
              value={formatDateForInput(config.startDate)}
              onChange={(e) => updateConfig('startDate', parseDateFromInput(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #CBD5E0',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500',
              marginBottom: '4px',
              color: '#4A5568'
            }}>
              종료일
            </label>
            <input
              type="date"
              value={formatDateForInput(config.endDate)}
              onChange={(e) => updateConfig('endDate', parseDateFromInput(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #CBD5E0',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* 자본금 설정 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500',
            marginBottom: '4px',
            color: '#4A5568'
          }}>
            초기 자본금
          </label>
          <input
            type="number"
            value={config.initialCapital}
            onChange={(e) => updateConfig('initialCapital', parseInt(e.target.value) || 0)}
            placeholder="10000000"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #CBD5E0',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          <p style={{ 
            fontSize: '12px', 
            color: '#718096',
            margin: '4px 0 0 0'
          }}>
            현재 설정: {formatCurrency(config.initialCapital)}
          </p>
        </div>

        {/* 수수료 및 슬리피지 */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '16px',
          marginBottom: '16px'
        }}>
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500',
              marginBottom: '4px',
              color: '#4A5568'
            }}>
              수수료 (%)
            </label>
            <input
              type="number"
              step="0.001"
              value={config.commission}
              onChange={(e) => updateConfig('commission', parseFloat(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #CBD5E0',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500',
              marginBottom: '4px',
              color: '#4A5568'
            }}>
              슬리피지 (%)
            </label>
            <input
              type="number"
              step="0.001"
              value={config.slippage}
              onChange={(e) => updateConfig('slippage', parseFloat(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #CBD5E0',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* 엔진 선택 */}
        <div>
          <p style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#2D3748',
            margin: '0 0 8px 0'
          }}>
            백테스트 엔진
          </p>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
            <button
              onClick={() => setUseComplexEngine(false)}
              style={{
                padding: '8px 16px',
                border: '1px solid #3182CE',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: !useComplexEngine ? '#3182CE' : 'transparent',
                color: !useComplexEngine ? 'white' : '#3182CE',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              간단한 엔진
              <span style={{
                padding: '2px 6px',
                backgroundColor: '#48BB78',
                color: 'white',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                빠름
              </span>
            </button>
            
            <button
              onClick={() => setUseComplexEngine(true)}
              disabled={true} // 아직 구현되지 않음
              style={{
                padding: '8px 16px',
                border: '1px solid #A0AEC0',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'not-allowed',
                backgroundColor: 'transparent',
                color: '#A0AEC0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              고성능 엔진
              <span style={{
                padding: '2px 6px',
                backgroundColor: '#ED8936',
                color: 'white',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                정밀
              </span>
            </button>
          </div>
          <p style={{ 
            fontSize: '12px', 
            color: '#718096',
            margin: '0'
          }}>
            간단한 엔진: 빠른 백테스트, 기본 지표만 지원<br/>
            고성능 엔진: 정밀한 백테스트, 모든 지표 지원 (개발 중)
          </p>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '24px 0' }} />

      {/* 진행률 표시 */}
      {progress && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#2D3748',
            margin: '0 0 8px 0'
          }}>
            진행 상황
          </p>
          
          <div style={{
            width: '100%',
            height: '12px',
            backgroundColor: '#E2E8F0',
            borderRadius: '6px',
            overflow: 'hidden',
            marginBottom: '8px'
          }}>
            <div style={{
              width: `${progress.progress}%`,
              height: '100%',
              backgroundColor: progress.status === 'failed' ? '#E53E3E' : '#3182CE',
              transition: 'width 0.3s ease'
            }} />
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '14px', color: '#4A5568' }}>
              {progress.message}
            </span>
            <span style={{ fontSize: '14px', color: '#718096' }}>
              {progress.progress.toFixed(1)}%
            </span>
          </div>

          {progress.currentDate && (
            <p style={{ 
              fontSize: '12px', 
              color: '#718096',
              margin: '4px 0 0 0'
            }}>
              처리 중: {new Date(progress.currentDate).toLocaleDateString('ko-KR')}
            </p>
          )}
        </div>
      )}

      {/* 오류 표시 */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#FED7D7',
          border: '1px solid #FC8181',
          borderRadius: '6px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#E53E3E', fontSize: '16px' }}>⚠️</span>
            <span style={{ fontSize: '14px', color: '#C53030' }}>{error}</span>
          </div>
        </div>
      )}

      {/* 버튼 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        gap: '12px'
      }}>
        <button
          onClick={onClose}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            border: '1px solid #CBD5E0',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            backgroundColor: 'transparent',
            color: '#4A5568'
          }}
        >
          취소
        </button>
        
        <button
          onClick={runBacktest}
          disabled={isRunning || config.startDate >= config.endDate}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: (isRunning || config.startDate >= config.endDate) ? 'not-allowed' : 'pointer',
            backgroundColor: (isRunning || config.startDate >= config.endDate) ? '#A0AEC0' : '#3182CE',
            color: 'white'
          }}
        >
          {isRunning ? '백테스트 실행 중...' : '백테스트 실행'}
        </button>
      </div>
    </div>
  );
};

export default BacktestRunner; 