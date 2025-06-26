/**
 * 종목 검색 및 선택 컴포넌트
 * 한국투자증권 API를 통한 종목 검색과 선택 기능을 제공합니다.
 */

import React, { useState, useCallback } from 'react';

// 종목 정보 인터페이스
interface StockInfo {
  symbol: string;      // 종목코드
  name: string;        // 종목명
  market: string;      // 시장구분 (KOSPI/KOSDAQ)
  price?: number;      // 현재가
  change?: number;     // 전일대비
  changeRate?: number; // 등락률
}

interface StockSelectorProps {
  selectedSymbols: string[];
  onSelectionChange: (symbols: string[]) => void;
  maxSelection?: number;
  placeholder?: string;
}

const StockSelector: React.FC<StockSelectorProps> = ({
  selectedSymbols,
  onSelectionChange,
  maxSelection = 10,
  placeholder = "종목명 또는 종목코드를 입력하세요"
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<StockInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 종목 검색 API 호출
   */
  const searchStocks = useCallback(async (query: string): Promise<StockInfo[]> => {
    if (!query.trim()) return [];

    try {
      // 현재는 모의 데이터를 사용 (추후 실제 API로 교체)
      const mockStocks: StockInfo[] = [
        { symbol: '005930', name: '삼성전자', market: 'KOSPI', price: 71000, change: 500, changeRate: 0.71 },
        { symbol: '000660', name: 'SK하이닉스', market: 'KOSPI', price: 89000, change: -1000, changeRate: -1.11 },
        { symbol: '035420', name: 'NAVER', market: 'KOSPI', price: 185000, change: 2000, changeRate: 1.09 },
        { symbol: '051910', name: 'LG화학', market: 'KOSPI', price: 420000, change: 5000, changeRate: 1.20 },
        { symbol: '006400', name: '삼성SDI', market: 'KOSPI', price: 550000, change: -10000, changeRate: -1.79 },
        { symbol: '207940', name: '삼성바이오로직스', market: 'KOSPI', price: 820000, change: 15000, changeRate: 1.86 },
        { symbol: '068270', name: '셀트리온', market: 'KOSPI', price: 180000, change: -2000, changeRate: -1.10 },
        { symbol: '035720', name: '카카오', market: 'KOSPI', price: 55000, change: 1000, changeRate: 1.85 },
        { symbol: '373220', name: 'LG에너지솔루션', market: 'KOSPI', price: 450000, change: 8000, changeRate: 1.81 },
        { symbol: '003670', name: '포스코홀딩스', market: 'KOSPI', price: 380000, change: -5000, changeRate: -1.30 }
      ];

      // 검색어로 필터링
      const filtered = mockStocks.filter(stock => 
        stock.name.includes(query) || 
        stock.symbol.includes(query)
      );

      return filtered.slice(0, 20); // 최대 20개까지
    } catch (error) {
      console.error('종목 검색 중 오류 발생:', error);
      throw new Error('종목 검색 중 오류가 발생했습니다.');
    }
  }, []);

  /**
   * 검색어 변경 처리
   */
  const handleSearchChange = useCallback(async (value: string) => {
    setSearchTerm(value);
    setError(null);

    if (!value.trim()) {
      setSearchResults([]);
      return;
    }

    if (value.length < 2) {
      return; // 최소 2글자 이상 입력해야 검색
    }

    setIsLoading(true);
    try {
      const results = await searchStocks(value);
      setSearchResults(results);
    } catch (error) {
      setError(error instanceof Error ? error.message : '검색 중 오류가 발생했습니다.');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchStocks]);

  /**
   * 종목 선택 처리
   */
  const handleStockSelect = useCallback((stock: StockInfo) => {
    if (selectedSymbols.includes(stock.symbol)) {
      return; // 이미 선택된 종목
    }

    if (selectedSymbols.length >= maxSelection) {
      setError(`최대 ${maxSelection}개까지만 선택할 수 있습니다.`);
      return;
    }

    const newSymbols = [...selectedSymbols, stock.symbol];
    onSelectionChange(newSymbols);
    setSearchTerm('');
    setSearchResults([]);
  }, [selectedSymbols, maxSelection, onSelectionChange]);

  /**
   * 선택된 종목 제거
   */
  const handleStockRemove = useCallback((symbol: string) => {
    const newSymbols = selectedSymbols.filter(s => s !== symbol);
    onSelectionChange(newSymbols);
  }, [selectedSymbols, onSelectionChange]);

  /**
   * 종목명 조회 (모의 데이터)
   */
  const getStockName = useCallback((symbol: string): string => {
    const stockNames: Record<string, string> = {
      '005930': '삼성전자',
      '000660': 'SK하이닉스',
      '035420': 'NAVER',
      '051910': 'LG화학',
      '006400': '삼성SDI',
      '207940': '삼성바이오로직스',
      '068270': '셀트리온',
      '035720': '카카오',
      '373220': 'LG에너지솔루션',
      '003670': '포스코홀딩스'
    };
    return stockNames[symbol] || symbol;
  }, []);

  /**
   * 가격 변동 색상 반환
   */
  const getPriceColor = (change?: number): string => {
    if (!change) return '#666';
    return change > 0 ? '#e53e3e' : change < 0 ? '#3182ce' : '#666';
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px'
  };

  const loadingStyle: React.CSSProperties = {
    textAlign: 'center',
    color: '#666',
    fontSize: '14px',
    marginTop: '8px'
  };

  const errorStyle: React.CSSProperties = {
    padding: '12px',
    backgroundColor: '#fed7d7',
    color: '#c53030',
    borderRadius: '6px',
    fontSize: '14px'
  };

  const resultsStyle: React.CSSProperties = {
    maxHeight: '200px',
    overflowY: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white'
  };

  const resultItemStyle: React.CSSProperties = {
    padding: '12px',
    borderBottom: '1px solid #f7fafc',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const selectedTagsStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  };

  const tagStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    backgroundColor: '#3182ce',
    color: 'white',
    borderRadius: '4px',
    fontSize: '12px'
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '0',
    lineHeight: '1'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '6px 12px',
    border: '1px solid #3182ce',
    backgroundColor: 'transparent',
    color: '#3182ce',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  };

  const guideStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#666',
    lineHeight: '1.4'
  };

  return (
    <div style={containerStyle}>
      {/* 검색 입력 */}
      <div>
        <input
          style={inputStyle}
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={placeholder}
        />
        {isLoading && (
          <div style={loadingStyle}>검색 중...</div>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {/* 검색 결과 */}
      {searchResults.length > 0 && (
        <div style={resultsStyle}>
          {searchResults.map((stock) => (
            <div
              key={stock.symbol}
              style={resultItemStyle}
              onClick={() => handleStockSelect(stock)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f7fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold' }}>{stock.name}</span>
                  <span style={{ fontSize: '12px', color: '#666' }}>({stock.symbol})</span>
                  <span style={{ fontSize: '10px', color: '#999' }}>{stock.market}</span>
                </div>
                {stock.price && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px' }}>{stock.price.toLocaleString()}원</span>
                    <span 
                      style={{ 
                        fontSize: '12px', 
                        color: getPriceColor(stock.change),
                        fontWeight: '500'
                      }}
                    >
                      {stock.change && stock.change > 0 ? '+' : ''}
                      {stock.change?.toLocaleString()}
                      ({stock.changeRate && stock.changeRate > 0 ? '+' : ''}
                      {stock.changeRate?.toFixed(2)}%)
                    </span>
                  </div>
                )}
              </div>
              <button style={buttonStyle}>선택</button>
            </div>
          ))}
        </div>
      )}

      {/* 선택된 종목 표시 */}
      {selectedSymbols.length > 0 && (
        <div>
          <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
            선택된 종목 ({selectedSymbols.length}/{maxSelection})
          </div>
          <div style={selectedTagsStyle}>
            {selectedSymbols.map((symbol) => (
              <div key={symbol} style={tagStyle}>
                <span>
                  {getStockName(symbol)} ({symbol})
                </span>
                <button 
                  style={closeButtonStyle}
                  onClick={() => handleStockRemove(symbol)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 선택 가이드 */}
      <div style={guideStyle}>
        • 종목명 또는 종목코드로 검색할 수 있습니다<br/>
        • 최대 {maxSelection}개까지 선택 가능합니다<br/>
        • 선택한 종목을 클릭하면 제거됩니다
      </div>
    </div>
  );
};

export default StockSelector; 