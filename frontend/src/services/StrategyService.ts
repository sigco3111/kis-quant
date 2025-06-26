/**
 * 전략 관리 서비스
 * Firebase와 localStorage를 활용한 전략 CRUD 기능을 제공합니다.
 */

import { 
  Strategy, 
  CreateStrategyRequest, 
  UpdateStrategyRequest, 
  StrategyValidation,
  StrategyTemplate,
  ConditionGroup,
  Condition,
  RiskManagement
} from '../types/Strategy';

class StrategyService {
  private static instance: StrategyService;
  private readonly STORAGE_KEY = 'kis_quant_strategies';
  private readonly TEMPLATES_KEY = 'kis_quant_strategy_templates';

  private constructor() {
    this.initializeTemplates();
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): StrategyService {
    if (!StrategyService.instance) {
      StrategyService.instance = new StrategyService();
    }
    return StrategyService.instance;
  }

  /**
   * 모든 전략 조회
   */
  public async getStrategies(): Promise<Strategy[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const strategies: Strategy[] = JSON.parse(stored);
      return strategies.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('전략 조회 중 오류 발생:', error);
      return [];
    }
  }

  /**
   * 특정 전략 조회
   */
  public async getStrategy(id: string): Promise<Strategy | null> {
    try {
      const strategies = await this.getStrategies();
      return strategies.find(s => s.id === id) || null;
    } catch (error) {
      console.error('전략 조회 중 오류 발생:', error);
      return null;
    }
  }

  /**
   * 새 전략 생성
   */
  public async createStrategy(request: CreateStrategyRequest): Promise<Strategy> {
    try {
      // 전략 검증
      const validation = this.validateStrategy(request);
      if (!validation.isValid) {
        throw new Error(`전략 검증 실패: ${validation.errors.join(', ')}`);
      }

      const now = Date.now();
      const strategy: Strategy = {
        id: this.generateId(),
        ...request,
        createdAt: now,
        updatedAt: now,
        isActive: false,
        version: 1
      };

      const strategies = await this.getStrategies();
      strategies.push(strategy);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(strategies));
      
      console.log('전략이 성공적으로 생성되었습니다:', strategy.name);
      return strategy;
    } catch (error) {
      console.error('전략 생성 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 전략 업데이트
   */
  public async updateStrategy(request: UpdateStrategyRequest): Promise<Strategy> {
    try {
      const strategies = await this.getStrategies();
      const index = strategies.findIndex(s => s.id === request.id);
      
      if (index === -1) {
        throw new Error('전략을 찾을 수 없습니다.');
      }

      const existingStrategy = strategies[index];
      const updatedStrategy: Strategy = {
        ...existingStrategy,
        ...request,
        updatedAt: Date.now(),
        version: existingStrategy.version + 1
      };

      // 업데이트된 전략 검증
      const validation = this.validateStrategy(updatedStrategy);
      if (!validation.isValid) {
        throw new Error(`전략 검증 실패: ${validation.errors.join(', ')}`);
      }

      strategies[index] = updatedStrategy;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(strategies));
      
      console.log('전략이 성공적으로 업데이트되었습니다:', updatedStrategy.name);
      return updatedStrategy;
    } catch (error) {
      console.error('전략 업데이트 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 전략 삭제
   */
  public async deleteStrategy(id: string): Promise<boolean> {
    try {
      const strategies = await this.getStrategies();
      const filteredStrategies = strategies.filter(s => s.id !== id);
      
      if (filteredStrategies.length === strategies.length) {
        throw new Error('삭제할 전략을 찾을 수 없습니다.');
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredStrategies));
      console.log('전략이 성공적으로 삭제되었습니다.');
      return true;
    } catch (error) {
      console.error('전략 삭제 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 전략 복사
   */
  public async duplicateStrategy(id: string, newName?: string): Promise<Strategy> {
    try {
      const originalStrategy = await this.getStrategy(id);
      if (!originalStrategy) {
        throw new Error('복사할 전략을 찾을 수 없습니다.');
      }

      const duplicatedStrategy: CreateStrategyRequest = {
        name: newName || `${originalStrategy.name} (복사본)`,
        description: originalStrategy.description,
        symbols: [...originalStrategy.symbols],
        buyConditions: JSON.parse(JSON.stringify(originalStrategy.buyConditions)),
        sellConditions: JSON.parse(JSON.stringify(originalStrategy.sellConditions)),
        riskManagement: { ...originalStrategy.riskManagement }
      };

      return await this.createStrategy(duplicatedStrategy);
    } catch (error) {
      console.error('전략 복사 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 전략 활성화/비활성화
   */
  public async toggleStrategyActive(id: string): Promise<Strategy> {
    try {
      const strategy = await this.getStrategy(id);
      if (!strategy) {
        throw new Error('전략을 찾을 수 없습니다.');
      }

      return await this.updateStrategy({
        id,
        isActive: !strategy.isActive
      });
    } catch (error) {
      console.error('전략 활성화 토글 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 전략 템플릿 조회
   */
  public async getTemplates(): Promise<StrategyTemplate[]> {
    try {
      const stored = localStorage.getItem(this.TEMPLATES_KEY);
      if (!stored) return [];
      
      return JSON.parse(stored);
    } catch (error) {
      console.error('템플릿 조회 중 오류 발생:', error);
      return [];
    }
  }

  /**
   * 템플릿으로부터 전략 생성
   */
  public async createFromTemplate(templateId: string, customName?: string): Promise<Strategy> {
    try {
      const templates = await this.getTemplates();
      const template = templates.find(t => t.id === templateId);
      
      if (!template) {
        throw new Error('템플릿을 찾을 수 없습니다.');
      }

      const request: CreateStrategyRequest = {
        ...template.strategy,
        name: customName || template.name
      };

      return await this.createStrategy(request);
    } catch (error) {
      console.error('템플릿으로부터 전략 생성 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 전략 검증
   */
  private validateStrategy(strategy: Partial<Strategy>): StrategyValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 필수 필드 검증
    if (!strategy.name?.trim()) {
      errors.push('전략 이름은 필수입니다.');
    }

    if (!strategy.symbols?.length) {
      errors.push('최소 하나의 종목을 선택해야 합니다.');
    }

    if (!strategy.buyConditions?.length) {
      errors.push('매수 조건은 필수입니다.');
    }

    if (!strategy.sellConditions?.length) {
      errors.push('매도 조건은 필수입니다.');
    }

    // 조건 그룹 검증
    if (strategy.buyConditions) {
      strategy.buyConditions.forEach((group, index) => {
        if (!group.conditions?.length) {
          errors.push(`매수 조건 그룹 ${index + 1}에 조건이 없습니다.`);
        }
      });
    }

    if (strategy.sellConditions) {
      strategy.sellConditions.forEach((group, index) => {
        if (!group.conditions?.length) {
          errors.push(`매도 조건 그룹 ${index + 1}에 조건이 없습니다.`);
        }
      });
    }

    // 리스크 관리 검증
    if (strategy.riskManagement) {
      const { stopLoss, takeProfit, maxPosition } = strategy.riskManagement;
      
      if (stopLoss && (stopLoss <= 0 || stopLoss >= 100)) {
        errors.push('손절 비율은 0%와 100% 사이여야 합니다.');
      }
      
      if (takeProfit && (takeProfit <= 0 || takeProfit >= 1000)) {
        warnings.push('익절 비율이 매우 높습니다. 다시 확인해주세요.');
      }
      
      if (maxPosition && (maxPosition <= 0 || maxPosition > 100)) {
        errors.push('최대 포지션 크기는 0%와 100% 사이여야 합니다.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 기본 템플릿 초기화
   */
  private initializeTemplates(): void {
    const existing = localStorage.getItem(this.TEMPLATES_KEY);
    if (existing) return;

    const defaultTemplates: StrategyTemplate[] = [
      {
        id: 'template_golden_cross',
        name: '골든 크로스 전략',
        description: '단기 이동평균이 장기 이동평균을 상향돌파할 때 매수하는 전략',
        category: 'trend_following',
        isPublic: true,
        usageCount: 0,
        strategy: {
          name: '골든 크로스 전략',
          description: '5일 이동평균이 20일 이동평균을 상향돌파할 때 매수',
          symbols: [],
          buyConditions: [{
            id: 'buy_group_1',
            operator: 'AND',
            description: '골든 크로스 발생',
            conditions: [{
              id: 'buy_condition_1',
              leftIndicator: { type: 'SMA', period: 5 },
              operator: 'CROSS_UP',
              rightIndicator: { type: 'SMA', period: 20 },
              description: '5일 이동평균이 20일 이동평균 상향돌파'
            }]
          }],
          sellConditions: [{
            id: 'sell_group_1',
            operator: 'OR',
            description: '데드 크로스 또는 손절',
            conditions: [{
              id: 'sell_condition_1',
              leftIndicator: { type: 'SMA', period: 5 },
              operator: 'CROSS_DOWN',
              rightIndicator: { type: 'SMA', period: 20 },
              description: '5일 이동평균이 20일 이동평균 하향돌파'
            }]
          }],
          riskManagement: {
            stopLoss: 5,
            takeProfit: 15,
            maxPosition: 30
          },
          isActive: false,
          version: 1
        }
      }
    ];

    localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(defaultTemplates));
  }

  /**
   * 고유 ID 생성
   */
  private generateId(): string {
    return 'strategy_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

export default StrategyService; 