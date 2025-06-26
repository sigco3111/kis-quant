/**
 * 기술 지표 선택 컴포넌트
 * 다양한 기술 지표를 선택하고 매개변수를 설정할 수 있는 인터페이스를 제공합니다.
 */

import React, { useState, useCallback } from 'react';
import { IndicatorType, IndicatorConfig } from '../types/Strategy';

interface IndicatorSelectorProps {
  value: IndicatorConfig | null;
  onChange: (indicator: IndicatorConfig) => void;
  placeholder?: string;
}

const IndicatorSelector: React.FC<IndicatorSelectorProps> = ({
  value,
  onChange,
  placeholder = "기술 지표를 선택하세요"
}) => {
  const [isOpen, setIsOpen] = useState(false);

  /**
   * 기술 지표 정보 매핑
   */
  const indicatorInfo: Record<IndicatorType, {
    name: string;
    description: string;
    defaultConfig: Partial<IndicatorConfig>;
    parameters: Array<{
      key: keyof IndicatorConfig;
      label: string;
      min: number;
      max: number;
      default: number;
      description: string;
    }>;
  }> = {
    SMA: {
      name: '단순이동평균',
      description: '지정된 기간의 평균 가격',
      defaultConfig: { period: 20 },
      parameters: [
        { key: 'period', label: '기간', min: 1, max: 200, default: 20, description: '이동평균 계산 기간' }
      ]
    },
    EMA: {
      name: '지수이동평균',
      description: '최근 가격에 더 큰 가중치를 부여한 이동평균',
      defaultConfig: { period: 20 },
      parameters: [
        { key: 'period', label: '기간', min: 1, max: 200, default: 20, description: '지수이동평균 계산 기간' }
      ]
    },
    RSI: {
      name: '상대강도지수',
      description: '과매수/과매도 상태를 판단하는 모멘텀 지표',
      defaultConfig: { period: 14 },
      parameters: [
        { key: 'period', label: '기간', min: 2, max: 50, default: 14, description: 'RSI 계산 기간' }
      ]
    },
    MACD: {
      name: 'MACD',
      description: '두 이동평균선의 차이를 이용한 추세 지표',
      defaultConfig: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
      parameters: [
        { key: 'fastPeriod', label: '빠른 기간', min: 1, max: 50, default: 12, description: '빠른 EMA 기간' },
        { key: 'slowPeriod', label: '느린 기간', min: 1, max: 100, default: 26, description: '느린 EMA 기간' },
        { key: 'signalPeriod', label: '신호선 기간', min: 1, max: 50, default: 9, description: '신호선 EMA 기간' }
      ]
    },
    BB: {
      name: '볼린저밴드',
      description: '이동평균과 표준편차를 이용한 변동성 지표',
      defaultConfig: { period: 20, stdDev: 2 },
      parameters: [
        { key: 'period', label: '기간', min: 1, max: 100, default: 20, description: '이동평균 기간' },
        { key: 'stdDev', label: '표준편차 배수', min: 0.5, max: 4, default: 2, description: '표준편차 곱셈 계수' }
      ]
    },
    STOCH: {
      name: '스토캐스틱',
      description: '일정 기간 내 최고가와 최저가 대비 현재 위치',
      defaultConfig: { kPeriod: 14, dPeriod: 3 },
      parameters: [
        { key: 'kPeriod', label: '%K 기간', min: 1, max: 50, default: 14, description: '%K 계산 기간' },
        { key: 'dPeriod', label: '%D 기간', min: 1, max: 20, default: 3, description: '%D 이동평균 기간' }
      ]
    },
    VOLUME: {
      name: '거래량',
      description: '주식 거래량',
      defaultConfig: {},
      parameters: []
    },
    PRICE: {
      name: '가격',
      description: '주식 가격 (종가)',
      defaultConfig: {},
      parameters: []
    }
  };

  /**
   * 지표 선택 처리
   */
  const handleIndicatorSelect = useCallback((type: IndicatorType) => {
    const info = indicatorInfo[type];
    const newIndicator: IndicatorConfig = {
      type,
      ...info.defaultConfig
    };
    onChange(newIndicator);
    setIsOpen(false);
  }, [onChange, indicatorInfo]);

  /**
   * 매개변수 변경 처리
   */
  const handleParameterChange = useCallback((key: keyof IndicatorConfig, newValue: number) => {
    if (!value) return;
    
    const updatedIndicator: IndicatorConfig = {
      ...value,
      [key]: newValue
    };
    onChange(updatedIndicator);
  }, [value, onChange]);

  /**
   * 지표 표시 텍스트 생성
   */
  const getIndicatorDisplayText = useCallback((indicator: IndicatorConfig): string => {
    const info = indicatorInfo[indicator.type];
    let text = info.name;
    
    const params: string[] = [];
    if (indicator.period) params.push(`${indicator.period}`);
    if (indicator.fastPeriod) params.push(`${indicator.fastPeriod}`);
    if (indicator.slowPeriod) params.push(`${indicator.slowPeriod}`);
    if (indicator.signalPeriod) params.push(`${indicator.signalPeriod}`);
    if (indicator.kPeriod) params.push(`%K:${indicator.kPeriod}`);
    if (indicator.dPeriod) params.push(`%D:${indicator.dPeriod}`);
    if (indicator.stdDev) params.push(`σ:${indicator.stdDev}`);
    
    if (params.length > 0) {
      text += `(${params.join(', ')})`;
    }
    
    return text;
  }, [indicatorInfo]);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%'
  };

  const selectorStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px'
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    maxHeight: '300px',
    overflowY: 'auto'
  };

  const optionStyle: React.CSSProperties = {
    padding: '12px',
    borderBottom: '1px solid #f7fafc',
    cursor: 'pointer'
  };

  const parametersStyle: React.CSSProperties = {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#f7fafc',
    borderRadius: '6px'
  };

  const parameterRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: '500',
    color: '#4a5568'
  };

  const inputStyle: React.CSSProperties = {
    width: '80px',
    padding: '4px 8px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '12px',
    textAlign: 'right'
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#666',
    marginTop: '4px'
  };

  return (
    <div style={containerStyle}>
      {/* 지표 선택기 */}
      <div 
        style={selectorStyle}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ color: value ? '#000' : '#999' }}>
          {value ? getIndicatorDisplayText(value) : placeholder}
        </span>
        <span style={{ fontSize: '12px', color: '#666' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {/* 드롭다운 옵션 */}
      {isOpen && (
        <div style={dropdownStyle}>
          {Object.entries(indicatorInfo).map(([type, info]) => (
            <div
              key={type}
              style={optionStyle}
              onClick={() => handleIndicatorSelect(type as IndicatorType)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f7fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                {info.name}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {info.description}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 매개변수 설정 */}
      {value && indicatorInfo[value.type].parameters.length > 0 && (
        <div style={parametersStyle}>
          <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: '#2d3748' }}>
            매개변수 설정
          </div>
          {indicatorInfo[value.type].parameters.map((param) => (
            <div key={param.key} style={parameterRowStyle}>
              <div>
                <div style={labelStyle}>{param.label}</div>
                <div style={descriptionStyle}>{param.description}</div>
              </div>
              <input
                type="number"
                min={param.min}
                max={param.max}
                step={param.key === 'stdDev' ? 0.1 : 1}
                value={value[param.key] || param.default}
                onChange={(e) => handleParameterChange(param.key, parseFloat(e.target.value))}
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      )}

      {/* 클릭 외부 영역 감지를 위한 오버레이 */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default IndicatorSelector; 