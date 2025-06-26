/**
 * 전략 빌더 메인 컴포넌트
 * 퀀트 투자 전략을 생성하고 편집할 수 있는 통합 인터페이스를 제공합니다.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { 
  Strategy, 
  CreateStrategyRequest, 
  ConditionGroup, 
  RiskManagement,
  StrategyTemplate
} from '../types/Strategy';
import StrategyService from '../services/StrategyService';
import StockSelector from './StockSelector';
import ConditionBuilder from './ConditionBuilder';

interface StrategyBuilderProps {
  strategy?: Strategy | null;
  onSave?: (strategy: Strategy) => void;
  onCancel?: () => void;
}

const StrategyBuilder: React.FC<StrategyBuilderProps> = ({
  strategy,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<CreateStrategyRequest>({
    name: '',
    description: '',
    symbols: [],
    buyConditions: [],
    sellConditions: [],
    riskManagement: {
      stopLoss: 5,
      takeProfit: 10,
      maxPosition: 30,
      maxDailyTrades: 5
    }
  });

  const [templates, setTemplates] = useState<StrategyTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(1);

  const strategyService = StrategyService.getInstance();

  /**
   * 기존 전략 로드 (편집 모드)
   */
  useEffect(() => {
    if (strategy) {
      setFormData({
        name: strategy.name,
        description: strategy.description,
        symbols: strategy.symbols,
        buyConditions: strategy.buyConditions,
        sellConditions: strategy.sellConditions,
        riskManagement: strategy.riskManagement
      });
    }
  }, [strategy]);

  /**
   * 템플릿 로드
   */
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templateList = await strategyService.getTemplates();
        setTemplates(templateList);
      } catch (error) {
        console.error('템플릿 로드 실패:', error);
      }
    };
    loadTemplates();
  }, [strategyService]);

  /**
   * 폼 데이터 업데이트
   */
  const updateFormData = useCallback((updates: Partial<CreateStrategyRequest>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setErrors([]); // 에러 초기화
  }, []);

  /**
   * 리스크 관리 설정 업데이트
   */
  const updateRiskManagement = useCallback((updates: Partial<RiskManagement>) => {
    setFormData(prev => ({
      ...prev,
      riskManagement: { ...prev.riskManagement, ...updates }
    }));
  }, []);

  /**
   * 템플릿 적용
   */
  const applyTemplate = useCallback(async (templateId: string) => {
    if (!templateId) return;

    try {
      setIsLoading(true);
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setFormData({
          name: template.strategy.name,
          description: template.strategy.description,
          symbols: template.strategy.symbols,
          buyConditions: template.strategy.buyConditions,
          sellConditions: template.strategy.sellConditions,
          riskManagement: template.strategy.riskManagement
        });
        setCurrentStep(2); // 종목 선택 단계로 이동
      }
    } catch (error) {
      console.error('템플릿 적용 실패:', error);
      setErrors(['템플릿 적용 중 오류가 발생했습니다.']);
    } finally {
      setIsLoading(false);
    }
  }, [templates]);

  /**
   * 전략 저장
   */
  const handleSave = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrors([]);

      let savedStrategy: Strategy;
      
      if (strategy) {
        // 기존 전략 업데이트
        savedStrategy = await strategyService.updateStrategy({
          id: strategy.id,
          ...formData
        });
      } else {
        // 새 전략 생성
        savedStrategy = await strategyService.createStrategy(formData);
      }

      onSave?.(savedStrategy);
    } catch (error) {
      console.error('전략 저장 실패:', error);
      if (error instanceof Error) {
        setErrors([error.message]);
      } else {
        setErrors(['전략 저장 중 오류가 발생했습니다.']);
      }
    } finally {
      setIsLoading(false);
    }
  }, [strategy, formData, strategyService, onSave]);

  /**
   * 전략 검증
   */
  const validateStrategy = useCallback((): boolean => {
    const newErrors: string[] = [];

    if (!formData.name.trim()) {
      newErrors.push('전략 이름을 입력하세요.');
    }

    if (formData.symbols.length === 0) {
      newErrors.push('최소 하나의 종목을 선택하세요.');
    }

    if (formData.buyConditions.length === 0) {
      newErrors.push('매수 조건을 설정하세요.');
    }

    if (formData.sellConditions.length === 0) {
      newErrors.push('매도 조건을 설정하세요.');
    }

    // 조건 그룹 내 조건 검증
    formData.buyConditions.forEach((group, index) => {
      if (group.conditions.length === 0) {
        newErrors.push(`매수 조건 그룹 ${index + 1}에 조건을 추가하세요.`);
      }
    });

    formData.sellConditions.forEach((group, index) => {
      if (group.conditions.length === 0) {
        newErrors.push(`매도 조건 그룹 ${index + 1}에 조건을 추가하세요.`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [formData]);

  /**
   * 다음 단계로 이동
   */
  const nextStep = useCallback(() => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);

  /**
   * 이전 단계로 이동
   */
  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const containerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const headerStyle: React.CSSProperties = {
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '16px',
    marginBottom: '24px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: '8px'
  };

  const stepIndicatorStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px'
  };

  const stepStyle = (stepNum: number): React.CSSProperties => ({
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    backgroundColor: currentStep === stepNum ? '#3182ce' : '#e2e8f0',
    color: currentStep === stepNum ? 'white' : '#666'
  });

  const sectionStyle: React.CSSProperties = {
    marginBottom: '24px',
    padding: '16px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px'
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '12px'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '14px',
    marginBottom: '8px'
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '80px',
    resize: 'vertical' as const
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '14px',
    marginBottom: '12px'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    marginRight: '8px'
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#3182ce',
    color: 'white'
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#e2e8f0',
    color: '#4a5568'
  };

  const errorStyle: React.CSSProperties = {
    backgroundColor: '#fed7d7',
    color: '#c53030',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '16px'
  };

  const riskRowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '12px'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '500',
    color: '#4a5568',
    marginBottom: '4px'
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // 기본 정보 및 템플릿
        return (
          <div>
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>템플릿 선택 (선택사항)</h3>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                style={selectStyle}
              >
                <option value="">직접 설정</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} - {template.description}
                  </option>
                ))}
              </select>
              {selectedTemplate && (
                <button
                  style={primaryButtonStyle}
                  onClick={() => applyTemplate(selectedTemplate)}
                  disabled={isLoading}
                >
                  템플릿 적용
                </button>
              )}
            </div>

            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>기본 정보</h3>
              <div style={labelStyle}>전략 이름</div>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                placeholder="전략 이름을 입력하세요"
                style={inputStyle}
              />
              
              <div style={labelStyle}>전략 설명</div>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
                placeholder="전략에 대한 설명을 입력하세요"
                style={textareaStyle}
              />
            </div>
          </div>
        );

      case 2: // 종목 선택
        return (
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>종목 선택</h3>
            <StockSelector
              selectedSymbols={formData.symbols}
              onSelectionChange={(symbols) => updateFormData({ symbols })}
              maxSelection={10}
            />
          </div>
        );

      case 3: // 매수 조건
        return (
          <div style={sectionStyle}>
            <ConditionBuilder
              title="매수 조건 설정"
              conditionGroups={formData.buyConditions}
              onChange={(groups) => updateFormData({ buyConditions: groups })}
            />
          </div>
        );

      case 4: // 매도 조건
        return (
          <div style={sectionStyle}>
            <ConditionBuilder
              title="매도 조건 설정"
              conditionGroups={formData.sellConditions}
              onChange={(groups) => updateFormData({ sellConditions: groups })}
            />
          </div>
        );

      case 5: // 리스크 관리
        return (
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>리스크 관리 설정</h3>
            
            <div style={riskRowStyle}>
              <div>
                <div style={labelStyle}>손절 비율 (%)</div>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={formData.riskManagement.stopLoss || ''}
                  onChange={(e) => updateRiskManagement({ 
                    stopLoss: parseFloat(e.target.value) || undefined 
                  })}
                  placeholder="예: 5"
                  style={inputStyle}
                />
              </div>
              
              <div>
                <div style={labelStyle}>익절 비율 (%)</div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.riskManagement.takeProfit || ''}
                  onChange={(e) => updateRiskManagement({ 
                    takeProfit: parseFloat(e.target.value) || undefined 
                  })}
                  placeholder="예: 10"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={riskRowStyle}>
              <div>
                <div style={labelStyle}>최대 포지션 크기 (%)</div>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.riskManagement.maxPosition || ''}
                  onChange={(e) => updateRiskManagement({ 
                    maxPosition: parseInt(e.target.value) || undefined 
                  })}
                  placeholder="예: 30"
                  style={inputStyle}
                />
              </div>
              
              <div>
                <div style={labelStyle}>일일 최대 거래 횟수</div>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.riskManagement.maxDailyTrades || ''}
                  onChange={(e) => updateRiskManagement({ 
                    maxDailyTrades: parseInt(e.target.value) || undefined 
                  })}
                  placeholder="예: 5"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#666', marginTop: '12px' }}>
              • 손절/익절 비율은 매수가 대비 비율입니다<br/>
              • 최대 포지션 크기는 총 자산 대비 비율입니다<br/>
              • 일일 최대 거래 횟수는 위험 관리를 위한 제한입니다
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>
          {strategy ? '전략 편집' : '새 전략 생성'}
        </h2>
        
        {/* 단계 표시기 */}
        <div style={stepIndicatorStyle}>
          <span style={stepStyle(1)}>1. 기본정보</span>
          <span style={stepStyle(2)}>2. 종목선택</span>
          <span style={stepStyle(3)}>3. 매수조건</span>
          <span style={stepStyle(4)}>4. 매도조건</span>
          <span style={stepStyle(5)}>5. 리스크관리</span>
        </div>
      </div>

      {/* 에러 표시 */}
      {errors.length > 0 && (
        <div style={errorStyle}>
          <strong>다음 항목을 확인해주세요:</strong>
          <ul style={{ margin: '8px 0 0 20px' }}>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 단계별 컨텐츠 */}
      {renderStepContent()}

      {/* 네비게이션 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
        <div>
          {currentStep > 1 && (
            <button style={secondaryButtonStyle} onClick={prevStep}>
              이전
            </button>
          )}
        </div>
        
        <div>
          {onCancel && (
            <button style={secondaryButtonStyle} onClick={onCancel}>
              취소
            </button>
          )}
          
          {currentStep < 5 ? (
            <button style={primaryButtonStyle} onClick={nextStep}>
              다음
            </button>
          ) : (
            <button 
              style={primaryButtonStyle} 
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? '저장 중...' : (strategy ? '수정 완료' : '전략 생성')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StrategyBuilder; 