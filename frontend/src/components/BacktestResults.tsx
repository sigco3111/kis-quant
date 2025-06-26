/**
 * 백테스트 결과 표시 컴포넌트
 * 백테스트 실행 결과를 차트와 통계로 표시합니다.
 */

import React, { useState } from 'react';
import { BacktestResult } from '../types/Strategy';

interface BacktestResultsProps {
  result: BacktestResult;
  onClose: () => void;
}

/**
 * 백테스트 결과 컴포넌트
 */
const BacktestResults: React.FC<BacktestResultsProps> = ({
  result,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'chart'>('overview');

  /**
   * 수익률 색상 결정
   */
  const getReturnColor = (value: number): string => {
    if (value > 0) return '#48BB78'; // 녹색
    if (value < 0) return '#E53E3E'; // 빨간색
    return '#718096'; // 회색
  };

  /**
   * 퍼센트 포맷팅
   */
  const formatPercentage = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
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

  /**
   * 날짜 포맷팅
   */
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('ko-KR');
  };

  /**
   * 거래 내역 렌더링
   */
  const renderTrades = () => {
    if (result.trades.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
          거래 내역이 없습니다.
        </div>
      );
    }

    return (
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#F7FAFC' }}>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>날짜</th>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>종목</th>
              <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>구분</th>
              <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>수량</th>
              <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>가격</th>
              <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>손익</th>
            </tr>
          </thead>
          <tbody>
            {result.trades.map((trade, index) => (
              <tr key={trade.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '8px', fontSize: '12px' }}>
                  {formatDate(trade.timestamp)}
                </td>
                <td style={{ padding: '8px', fontSize: '12px' }}>
                  {trade.symbol}
                </td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '500',
                    backgroundColor: trade.type === 'BUY' ? '#C6F6D5' : '#FED7D7',
                    color: trade.type === 'BUY' ? '#2F855A' : '#C53030'
                  }}>
                    {trade.type === 'BUY' ? '매수' : '매도'}
                  </span>
                </td>
                <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>
                  {trade.quantity.toLocaleString()}
                </td>
                <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>
                  {formatCurrency(trade.price)}
                </td>
                <td style={{ 
                  padding: '8px', 
                  textAlign: 'right', 
                  fontSize: '12px',
                  color: trade.pnl ? getReturnColor(trade.pnl) : '#718096'
                }}>
                  {trade.pnl ? formatCurrency(trade.pnl) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  /**
   * 간단한 수익률 차트 렌더링 (SVG 사용)
   */
  const renderChart = () => {
    if (result.dailyReturns.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
          차트 데이터가 없습니다.
        </div>
      );
    }

    const returns = result.dailyReturns;
    const width = 600;
    const height = 300;
    const padding = 40;

    // 데이터 범위 계산
    const minReturn = Math.min(...returns.map(r => r.cumulativeReturn));
    const maxReturn = Math.max(...returns.map(r => r.cumulativeReturn));
    const returnRange = maxReturn - minReturn || 1;

    // 점들의 좌표 계산
    const points = returns.map((r, index) => {
      const x = padding + (index / (returns.length - 1)) * (width - 2 * padding);
      const y = padding + (1 - (r.cumulativeReturn - minReturn) / returnRange) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div style={{ textAlign: 'center' }}>
        <svg width={width} height={height} style={{ border: '1px solid #E2E8F0', borderRadius: '6px' }}>
          {/* 격자 */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#F7FAFC" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* 0% 기준선 */}
          {minReturn <= 0 && maxReturn >= 0 && (
            <line
              x1={padding}
              y1={padding + (1 - (0 - minReturn) / returnRange) * (height - 2 * padding)}
              x2={width - padding}
              y2={padding + (1 - (0 - minReturn) / returnRange) * (height - 2 * padding)}
              stroke="#A0AEC0"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}
          
          {/* 수익률 라인 */}
          <polyline
            points={points}
            fill="none"
            stroke="#3182CE"
            strokeWidth="2"
          />
          
          {/* Y축 라벨 */}
          <text x="10" y={padding} fontSize="12" fill="#718096" textAnchor="start">
            {formatPercentage(maxReturn)}
          </text>
          <text x="10" y={height - padding + 5} fontSize="12" fill="#718096" textAnchor="start">
            {formatPercentage(minReturn)}
          </text>
          
          {/* X축 라벨 */}
          <text x={padding} y={height - 10} fontSize="12" fill="#718096" textAnchor="start">
            {formatDate(returns[0].date)}
          </text>
          <text x={width - padding} y={height - 10} fontSize="12" fill="#718096" textAnchor="end">
            {formatDate(returns[returns.length - 1].date)}
          </text>
        </svg>
        
        <p style={{ fontSize: '14px', color: '#718096', marginTop: '8px' }}>
          누적 수익률 추이
        </p>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: '#2D3748',
          margin: '0 0 8px 0'
        }}>
          📊 백테스트 결과
        </h2>
        <p style={{ 
          fontSize: '14px', 
          color: '#718096',
          margin: '0'
        }}>
          {formatDate(result.startDate)} ~ {formatDate(result.endDate)}
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #E2E8F0',
        marginBottom: '24px'
      }}>
        {[
          { key: 'overview', label: '개요' },
          { key: 'trades', label: '거래내역' },
          { key: 'chart', label: '차트' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '12px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === tab.key ? '#3182CE' : '#718096',
              borderBottom: activeTab === tab.key ? '2px solid #3182CE' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === 'overview' && (
        <div>
          {/* 주요 지표 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#F7FAFC', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '12px', color: '#718096', margin: '0 0 4px 0' }}>총 수익률</p>
              <p style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                color: getReturnColor(result.totalReturn),
                margin: '0'
              }}>
                {formatPercentage(result.totalReturn)}
              </p>
            </div>
            
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#F7FAFC', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '12px', color: '#718096', margin: '0 0 4px 0' }}>연환산 수익률</p>
              <p style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                color: getReturnColor(result.annualizedReturn),
                margin: '0'
              }}>
                {formatPercentage(result.annualizedReturn)}
              </p>
            </div>
            
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#F7FAFC', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '12px', color: '#718096', margin: '0 0 4px 0' }}>최대 낙폭</p>
              <p style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                color: '#E53E3E',
                margin: '0'
              }}>
                -{result.maxDrawdown.toFixed(2)}%
              </p>
            </div>
            
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#F7FAFC', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '12px', color: '#718096', margin: '0 0 4px 0' }}>샤프 비율</p>
              <p style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                color: '#2D3748',
                margin: '0'
              }}>
                {result.sharpeRatio.toFixed(2)}
              </p>
            </div>
          </div>

          {/* 거래 통계 */}
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#FFFFFF', 
            border: '1px solid #E2E8F0',
            borderRadius: '8px'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#2D3748',
              margin: '0 0 16px 0'
            }}>
              거래 통계
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '16px'
            }}>
              <div>
                <p style={{ fontSize: '12px', color: '#718096', margin: '0 0 4px 0' }}>총 거래 횟수</p>
                <p style={{ fontSize: '16px', fontWeight: '600', color: '#2D3748', margin: '0' }}>
                  {result.totalTrades}회
                </p>
              </div>
              
              <div>
                <p style={{ fontSize: '12px', color: '#718096', margin: '0 0 4px 0' }}>승률</p>
                <p style={{ fontSize: '16px', fontWeight: '600', color: '#2D3748', margin: '0' }}>
                  {result.winRate.toFixed(1)}%
                </p>
              </div>
              
              <div>
                <p style={{ fontSize: '12px', color: '#718096', margin: '0 0 4px 0' }}>평균 수익</p>
                <p style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: getReturnColor(result.avgProfit),
                  margin: '0'
                }}>
                  {formatPercentage(result.avgProfit)}
                </p>
              </div>
              
              <div>
                <p style={{ fontSize: '12px', color: '#718096', margin: '0 0 4px 0' }}>평균 손실</p>
                <p style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: '#E53E3E',
                  margin: '0'
                }}>
                  -{result.avgLoss.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trades' && renderTrades()}
      {activeTab === 'chart' && renderChart()}

      {/* 닫기 버튼 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginTop: '24px'
      }}>
        <button
          onClick={onClose}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
            backgroundColor: '#3182CE',
            color: 'white'
          }}
        >
          닫기
        </button>
      </div>
    </div>
  );
};

export default BacktestResults; 