/**
 * 조건 빌더 컴포넌트
 * 매수/매도 조건을 직관적으로 설정할 수 있는 드래그앤드롭 인터페이스를 제공합니다.
 */

import React, { useState, useCallback } from 'react';
import { 
  Condition, 
  ConditionGroup, 
  ComparisonOperator, 
  LogicalOperator,
  IndicatorConfig
} from '../types/Strategy';
import IndicatorSelector from './IndicatorSelector';

interface ConditionBuilderProps {
  conditionGroups: ConditionGroup[];
  onChange: (groups: ConditionGroup[]) => void;
  title: string;
}

const ConditionBuilder: React.FC<ConditionBuilderProps> = ({
  conditionGroups,
  onChange,
  title
}) => {
  const [draggedCondition, setDraggedCondition] = useState<string | null>(null);

  /**
   * 비교 연산자 정보
   */
  const operatorInfo: Record<ComparisonOperator, { symbol: string; name: string; description: string }> = {
    GT: { symbol: '>', name: '초과', description: '왼쪽이 오른쪽보다 큰 경우' },
    GTE: { symbol: '≥', name: '이상', description: '왼쪽이 오른쪽보다 크거나 같은 경우' },
    LT: { symbol: '<', name: '미만', description: '왼쪽이 오른쪽보다 작은 경우' },
    LTE: { symbol: '≤', name: '이하', description: '왼쪽이 오른쪽보다 작거나 같은 경우' },
    EQ: { symbol: '=', name: '같음', description: '왼쪽과 오른쪽이 같은 경우' },
    CROSS_UP: { symbol: '↗', name: '상향돌파', description: '왼쪽이 오른쪽을 아래에서 위로 돌파' },
    CROSS_DOWN: { symbol: '↘', name: '하향돌파', description: '왼쪽이 오른쪽을 위에서 아래로 돌파' }
  };

  /**
   * 새 조건 그룹 추가
   */
  const addConditionGroup = useCallback(() => {
    const newGroup: ConditionGroup = {
      id: `group_${Date.now()}`,
      conditions: [],
      operator: 'AND',
      description: `조건 그룹 ${conditionGroups.length + 1}`
    };
    onChange([...conditionGroups, newGroup]);
  }, [conditionGroups, onChange]);

  /**
   * 조건 그룹 삭제
   */
  const removeConditionGroup = useCallback((groupId: string) => {
    const updatedGroups = conditionGroups.filter(group => group.id !== groupId);
    onChange(updatedGroups);
  }, [conditionGroups, onChange]);

  /**
   * 새 조건 추가
   */
  const addCondition = useCallback((groupId: string) => {
    const newCondition: Condition = {
      id: `condition_${Date.now()}`,
      leftIndicator: { type: 'PRICE' },
      operator: 'GT',
      value: 0,
      description: '새 조건'
    };

    const updatedGroups = conditionGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: [...group.conditions, newCondition]
        };
      }
      return group;
    });
    onChange(updatedGroups);
  }, [conditionGroups, onChange]);

  /**
   * 조건 삭제
   */
  const removeCondition = useCallback((groupId: string, conditionId: string) => {
    const updatedGroups = conditionGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: group.conditions.filter(condition => condition.id !== conditionId)
        };
      }
      return group;
    });
    onChange(updatedGroups);
  }, [conditionGroups, onChange]);

  /**
   * 조건 업데이트
   */
  const updateCondition = useCallback((groupId: string, conditionId: string, updates: Partial<Condition>) => {
    const updatedGroups = conditionGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: group.conditions.map(condition => {
            if (condition.id === conditionId) {
              return { ...condition, ...updates };
            }
            return condition;
          })
        };
      }
      return group;
    });
    onChange(updatedGroups);
  }, [conditionGroups, onChange]);

  /**
   * 그룹 논리 연산자 변경
   */
  const updateGroupOperator = useCallback((groupId: string, operator: LogicalOperator) => {
    const updatedGroups = conditionGroups.map(group => {
      if (group.id === groupId) {
        return { ...group, operator };
      }
      return group;
    });
    onChange(updatedGroups);
  }, [conditionGroups, onChange]);

  /**
   * 조건 설명 자동 생성
   */
  const generateConditionDescription = useCallback((condition: Condition): string => {
    const leftText = getIndicatorText(condition.leftIndicator);
    const operatorText = operatorInfo[condition.operator].name;
    
    if (condition.rightIndicator) {
      const rightText = getIndicatorText(condition.rightIndicator);
      return `${leftText} ${operatorText} ${rightText}`;
    } else {
      return `${leftText} ${operatorText} ${condition.value}`;
    }
  }, []);

  /**
   * 지표 텍스트 생성
   */
  const getIndicatorText = (indicator: IndicatorConfig): string => {
    switch (indicator.type) {
      case 'SMA': return `SMA(${indicator.period})`;
      case 'EMA': return `EMA(${indicator.period})`;
      case 'RSI': return `RSI(${indicator.period})`;
      case 'MACD': return `MACD(${indicator.fastPeriod},${indicator.slowPeriod},${indicator.signalPeriod})`;
      case 'BB': return `BB(${indicator.period},${indicator.stdDev})`;
      case 'STOCH': return `STOCH(${indicator.kPeriod},${indicator.dPeriod})`;
      case 'VOLUME': return '거래량';
      case 'PRICE': return '가격';
      default: return indicator.type;
    }
  };

  const containerStyle: React.CSSProperties = {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    backgroundColor: '#fafafa'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#2d3748'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '6px 12px',
    border: '1px solid #3182ce',
    backgroundColor: '#3182ce',
    color: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  };

  const groupStyle: React.CSSProperties = {
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '12px',
    backgroundColor: 'white'
  };

  const groupHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  };

  const conditionStyle: React.CSSProperties = {
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    padding: '12px',
    marginBottom: '8px',
    backgroundColor: '#f7fafc',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  };

  const conditionRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  };

  const selectStyle: React.CSSProperties = {
    padding: '4px 8px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '12px',
    minWidth: '80px'
  };

  const inputStyle: React.CSSProperties = {
    padding: '4px 8px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '12px',
    width: '80px'
  };

  const removeButtonStyle: React.CSSProperties = {
    padding: '4px 8px',
    border: '1px solid #e53e3e',
    backgroundColor: 'transparent',
    color: '#e53e3e',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  };

  const operatorButtonStyle: React.CSSProperties = {
    padding: '4px 8px',
    border: '1px solid #38a169',
    backgroundColor: '#38a169',
    color: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>{title}</h3>
        <button style={buttonStyle} onClick={addConditionGroup}>
          + 조건 그룹 추가
        </button>
      </div>

      {conditionGroups.length === 0 && (
        <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
          조건 그룹을 추가하여 {title.includes('매수') ? '매수' : '매도'} 조건을 설정하세요.
        </div>
      )}

      {conditionGroups.map((group, groupIndex) => (
        <div key={group.id} style={groupStyle}>
          <div style={groupHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                그룹 {groupIndex + 1}
              </span>
              <select
                value={group.operator}
                onChange={(e) => updateGroupOperator(group.id, e.target.value as LogicalOperator)}
                style={selectStyle}
              >
                <option value="AND">AND (모든 조건)</option>
                <option value="OR">OR (하나 이상)</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={buttonStyle}
                onClick={() => addCondition(group.id)}
              >
                + 조건 추가
              </button>
              <button
                style={removeButtonStyle}
                onClick={() => removeConditionGroup(group.id)}
              >
                그룹 삭제
              </button>
            </div>
          </div>

          {group.conditions.length === 0 && (
            <div style={{ textAlign: 'center', color: '#666', padding: '12px' }}>
              조건을 추가하세요.
            </div>
          )}

          {group.conditions.map((condition, conditionIndex) => (
            <div key={condition.id} style={conditionStyle}>
              <div style={conditionRowStyle}>
                <span style={{ fontSize: '12px', color: '#666', minWidth: '40px' }}>
                  {conditionIndex + 1}.
                </span>
                
                {/* 왼쪽 지표 */}
                <div style={{ minWidth: '200px' }}>
                  <IndicatorSelector
                    value={condition.leftIndicator}
                    onChange={(indicator) => 
                      updateCondition(group.id, condition.id, { 
                        leftIndicator: indicator,
                        description: generateConditionDescription({
                          ...condition,
                          leftIndicator: indicator
                        })
                      })
                    }
                    placeholder="지표 선택"
                  />
                </div>

                {/* 비교 연산자 */}
                <select
                  value={condition.operator}
                  onChange={(e) => {
                    const operator = e.target.value as ComparisonOperator;
                    updateCondition(group.id, condition.id, { 
                      operator,
                      description: generateConditionDescription({
                        ...condition,
                        operator
                      })
                    });
                  }}
                  style={selectStyle}
                >
                  {Object.entries(operatorInfo).map(([op, info]) => (
                    <option key={op} value={op}>
                      {info.symbol} {info.name}
                    </option>
                  ))}
                </select>

                {/* 오른쪽 값 또는 지표 */}
                {condition.operator === 'CROSS_UP' || condition.operator === 'CROSS_DOWN' ? (
                  <div style={{ minWidth: '200px' }}>
                    <IndicatorSelector
                      value={condition.rightIndicator || null}
                      onChange={(indicator) => 
                        updateCondition(group.id, condition.id, { 
                          rightIndicator: indicator,
                          value: undefined,
                          description: generateConditionDescription({
                            ...condition,
                            rightIndicator: indicator,
                            value: undefined
                          })
                        })
                      }
                      placeholder="비교 지표 선택"
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      value={condition.value || 0}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        updateCondition(group.id, condition.id, { 
                          value,
                          rightIndicator: undefined,
                          description: generateConditionDescription({
                            ...condition,
                            value,
                            rightIndicator: undefined
                          })
                        });
                      }}
                      style={inputStyle}
                      step="0.01"
                    />
                    <button
                      style={operatorButtonStyle}
                      onClick={() => {
                        updateCondition(group.id, condition.id, { 
                          rightIndicator: { type: 'PRICE' },
                          value: undefined
                        });
                      }}
                    >
                      지표로 변경
                    </button>
                  </div>
                )}

                <button
                  style={removeButtonStyle}
                  onClick={() => removeCondition(group.id, condition.id)}
                >
                  삭제
                </button>
              </div>

              {/* 조건 설명 */}
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                {condition.description || generateConditionDescription(condition)}
              </div>
            </div>
          ))}
        </div>
      ))}

      {conditionGroups.length > 1 && (
        <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
          💡 여러 그룹이 있을 경우 OR 조건으로 연결됩니다. (그룹1 OR 그룹2 OR ...)
        </div>
      )}
    </div>
  );
};

export default ConditionBuilder; 