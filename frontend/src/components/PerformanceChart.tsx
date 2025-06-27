/**
 * 실시간 성과 차트 컴포넌트
 * 포트폴리오 수익률과 개별 종목의 성과를 실시간으로 시각화합니다.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  ButtonGroup,
  SimpleGrid,
  Spinner
} from '@chakra-ui/react';

// 차트 데이터 포인트 인터페이스
interface ChartDataPoint {
  timestamp: number;
  value: number;
  label: string;
}

// 성과 지표 인터페이스
interface PerformanceMetrics {
  totalReturn: number;
  dailyReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  profitFactor: number;
}

interface PerformanceChartProps {
  userId?: string;
  height?: number;
  refreshInterval?: number;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  userId,
  height = 300,
  refreshInterval = 2000 // 2초마다 업데이트
}) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | '3M'>('1D');

  /**
   * 목 성과 데이터 생성
   */
  const generateMockData = useCallback((): ChartDataPoint[] => {
    const now = Date.now();
    const dataPoints: ChartDataPoint[] = [];
    const pointCount = timeRange === '1D' ? 48 : timeRange === '1W' ? 168 : timeRange === '1M' ? 720 : 2160;
    const intervalMs = timeRange === '1D' ? 30 * 60 * 1000 : 60 * 60 * 1000; // 30분 또는 1시간 간격

    let currentValue = 100; // 기준값 100%
    
    for (let i = 0; i < pointCount; i++) {
      const timestamp = now - (pointCount - i - 1) * intervalMs;
      
      // 랜덤한 수익률 변동 (-1% ~ +1%)
      const change = (Math.random() - 0.5) * 2;
      currentValue *= (1 + change / 100);
      
      // 전체적인 상승 트렌드 추가
      const trendBoost = i / pointCount * 0.1; // 최대 0.1% 상승 트렌드
      currentValue *= (1 + trendBoost / 100);
      
      dataPoints.push({
        timestamp,
        value: currentValue,
        label: new Date(timestamp).toLocaleTimeString('ko-KR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      });
    }
    
    return dataPoints;
  }, [timeRange]);

  /**
   * 성과 지표 계산
   */
  const calculateMetrics = useCallback((data: ChartDataPoint[]): PerformanceMetrics => {
    if (data.length === 0) {
      return {
        totalReturn: 0,
        dailyReturn: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        winRate: 0,
        profitFactor: 0
      };
    }

    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const totalReturn = ((lastValue - firstValue) / firstValue) * 100;

    // 일일 수익률 계산
    const dailyReturns = data.slice(1).map((point, index) => {
      const prevValue = data[index].value;
      return ((point.value - prevValue) / prevValue) * 100;
    });

    const dailyReturn = dailyReturns.length > 0 ? 
      dailyReturns[dailyReturns.length - 1] : 0;

    // 최대 낙폭 계산
    let maxDrawdown = 0;
    let peak = data[0].value;
    
    data.forEach(point => {
      if (point.value > peak) {
        peak = point.value;
      } else {
        const drawdown = ((peak - point.value) / peak) * 100;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    });

    // 샤프 비율 계산 (간단한 근사치)
    const avgReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length;
    const returnStd = Math.sqrt(
      dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / dailyReturns.length
    );
    const sharpeRatio = returnStd > 0 ? (avgReturn / returnStd) * Math.sqrt(252) : 0;

    // 승률 계산
    const positiveReturns = dailyReturns.filter(ret => ret > 0).length;
    const winRate = (positiveReturns / dailyReturns.length) * 100;

    // 수익 팩터 계산
    const profits = dailyReturns.filter(ret => ret > 0).reduce((sum, ret) => sum + ret, 0);
    const losses = Math.abs(dailyReturns.filter(ret => ret < 0).reduce((sum, ret) => sum + ret, 0));
    const profitFactor = losses > 0 ? profits / losses : profits > 0 ? 999 : 0;

    return {
      totalReturn,
      dailyReturn,
      maxDrawdown,
      sharpeRatio,
      winRate,
      profitFactor
    };
  }, []);

  /**
   * 차트 데이터 업데이트
   */
  const updateChartData = useCallback(async () => {
    try {
      // 네트워크 지연 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const newData = generateMockData();
      const newMetrics = calculateMetrics(newData);
      
      setChartData(newData);
      setMetrics(newMetrics);
      setIsLoading(false);
      
    } catch (error) {
      console.error('차트 데이터 업데이트 실패:', error);
    }
  }, [generateMockData, calculateMetrics]);

  /**
   * 실시간 업데이트 설정
   */
  useEffect(() => {
    updateChartData();
    const interval = setInterval(updateChartData, refreshInterval);
    return () => clearInterval(interval);
  }, [updateChartData, refreshInterval, timeRange]);

  /**
   * SVG 차트 렌더링을 위한 계산
   */
  const chartConfig = useMemo(() => {
    if (chartData.length === 0) return null;

    const padding = 40;
    const width = 800;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const minValue = Math.min(...chartData.map(d => d.value));
    const maxValue = Math.max(...chartData.map(d => d.value));
    const valueRange = maxValue - minValue;

    // 기준선 (100%) 위치 계산
    const baselineY = padding + chartHeight - ((100 - minValue) / valueRange) * chartHeight;

    const pathData = chartData.map((point, index) => {
      const x = padding + (index / (chartData.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
      return { x, y, value: point.value, timestamp: point.timestamp };
    });

    return {
      width,
      height,
      padding,
      pathData,
      baselineY,
      minValue,
      maxValue,
      valueRange
    };
  }, [chartData, height]);

  /**
   * 금액/퍼센트 포맷팅
   */
  const formatPercentage = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatNumber = (value: number, decimals: number = 2): string => {
    return value.toFixed(decimals);
  };

  if (isLoading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" color="blue.500" />
        <Text mt={4} color="gray.600">성과 차트 로딩 중...</Text>
      </Box>
    );
  }

  return (
    <VStack gap={6} align="stretch">
      {/* 헤더 및 컨트롤 */}
      <HStack justify="space-between" align="center">
        <Text fontSize="xl" fontWeight="bold">📈 실시간 성과 차트</Text>
        
        <HStack gap={4}>
          {/* 기간 선택 */}
          <ButtonGroup size="sm" attached>
            {(['1D', '1W', '1M', '3M'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'solid' : 'outline'}
                onClick={() => setTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </ButtonGroup>
        </HStack>
      </HStack>

      {/* 성과 지표 */}
      {metrics && (
        <SimpleGrid columns={{ base: 3, md: 6 }} gap={4}>
          <Box p={3} bg="white" borderRadius="lg" border="1px solid #E2E8F0">
            <Text fontSize="xs" color="gray.600">총 수익률</Text>
            <Text fontSize="lg" fontWeight="bold" color={metrics.totalReturn >= 0 ? 'green.500' : 'red.500'}>
              {formatPercentage(metrics.totalReturn)}
            </Text>
          </Box>
          
          <Box p={3} bg="white" borderRadius="lg" border="1px solid #E2E8F0">
            <Text fontSize="xs" color="gray.600">일일 수익률</Text>
            <Text fontSize="lg" fontWeight="bold" color={metrics.dailyReturn >= 0 ? 'green.500' : 'red.500'}>
              {formatPercentage(metrics.dailyReturn)}
            </Text>
          </Box>
          
          <Box p={3} bg="white" borderRadius="lg" border="1px solid #E2E8F0">
            <Text fontSize="xs" color="gray.600">최대 낙폭</Text>
            <Text fontSize="lg" fontWeight="bold" color="red.500">
              -{formatNumber(metrics.maxDrawdown)}%
            </Text>
          </Box>
          
          <Box p={3} bg="white" borderRadius="lg" border="1px solid #E2E8F0">
            <Text fontSize="xs" color="gray.600">샤프 비율</Text>
            <Text fontSize="lg" fontWeight="bold">
              {formatNumber(metrics.sharpeRatio)}
            </Text>
          </Box>
          
          <Box p={3} bg="white" borderRadius="lg" border="1px solid #E2E8F0">
            <Text fontSize="xs" color="gray.600">승률</Text>
            <Text fontSize="lg" fontWeight="bold">
              {formatNumber(metrics.winRate)}%
            </Text>
          </Box>
          
          <Box p={3} bg="white" borderRadius="lg" border="1px solid #E2E8F0">
            <Text fontSize="xs" color="gray.600">수익 팩터</Text>
            <Text fontSize="lg" fontWeight="bold">
              {formatNumber(metrics.profitFactor)}
            </Text>
          </Box>
        </SimpleGrid>
      )}

      {/* 차트 */}
      <Box bg="white" p={4} borderRadius="lg" border="1px solid #E2E8F0">
        {chartConfig ? (
          <svg width="100%" height={height} viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}>
            {/* 격자 */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* 기준선 (100%) */}
            <line
              x1={chartConfig.padding}
              y1={chartConfig.baselineY}
              x2={chartConfig.width - chartConfig.padding}
              y2={chartConfig.baselineY}
              stroke="#718096"
              strokeWidth="1"
              strokeDasharray="5,5"
            />
            <text
              x={chartConfig.padding - 5}
              y={chartConfig.baselineY}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="12"
              fill="#718096"
            >
              100%
            </text>
            
            {/* 차트 라인 */}
            <path
              d={`M ${chartConfig.pathData.map(p => `${p.x},${p.y}`).join(' L ')}`}
              fill="none"
              stroke="#3182CE"
              strokeWidth="2"
            />
            
            {/* 차트 영역 채우기 */}
            <path
              d={`M ${chartConfig.pathData[0].x},${chartConfig.baselineY} L ${chartConfig.pathData.map(p => `${p.x},${p.y}`).join(' L ')} L ${chartConfig.pathData[chartConfig.pathData.length - 1].x},${chartConfig.baselineY} Z`}
              fill="rgba(49, 130, 206, 0.1)"
            />
            
            {/* 데이터 포인트 */}
            {chartConfig.pathData.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="3"
                fill="#3182CE"
                opacity={index === chartConfig.pathData.length - 1 ? 1 : 0.3}
              />
            ))}
            
            {/* Y축 레이블 */}
            <text
              x={chartConfig.padding - 5}
              y={chartConfig.padding}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="12"
              fill="#718096"
            >
              {formatNumber(chartConfig.maxValue)}%
            </text>
            <text
              x={chartConfig.padding - 5}
              y={chartConfig.height - chartConfig.padding}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="12"
              fill="#718096"
            >
              {formatNumber(chartConfig.minValue)}%
            </text>
          </svg>
        ) : (
          <Box textAlign="center" py={8} color="gray.500">
            차트 데이터가 없습니다.
          </Box>
        )}
      </Box>
    </VStack>
  );
};

export default PerformanceChart; 