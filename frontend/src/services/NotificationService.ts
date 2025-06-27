/**
 * 웹 알림 서비스
 * 실시간 매매 상황 및 중요 이벤트에 대한 알림을 제공합니다.
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  data?: any;
}

export interface AlertConfig {
  priceChange: number;        // 가격 변동률 알림 기준 (%)
  profitLoss: number;         // 손익 알림 기준 (%)
  orderExecution: boolean;    // 주문 체결 알림
  systemError: boolean;       // 시스템 오류 알림
  serverStatus: boolean;      // 서버 상태 알림
}

export type AlertType = 
  | 'order_filled'        // 주문 체결
  | 'profit_target'       // 목표 수익 달성
  | 'stop_loss'          // 손절 실행
  | 'price_alert'        // 가격 알림
  | 'system_error'       // 시스템 오류
  | 'server_down'        // 서버 다운
  | 'trading_stopped'    // 매매 중지
  | 'daily_summary';     // 일일 요약

class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';
  private alertConfig: AlertConfig;
  private isEnabled: boolean = false;

  private constructor() {
    this.alertConfig = this.getDefaultConfig();
    this.initializeService();
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * 서비스 초기화
   */
  private async initializeService(): Promise<void> {
    try {
      // 브라우저 지원 확인
      if (!('Notification' in window)) {
        console.warn('이 브라우저는 웹 알림을 지원하지 않습니다.');
        return;
      }

      // 저장된 설정 로드
      await this.loadSettings();
      
      // 권한 상태 확인
      this.permission = Notification.permission;
      
      console.log('알림 서비스 초기화 완료');
    } catch (error) {
      console.error('알림 서비스 초기화 실패:', error);
    }
  }

  /**
   * 알림 권한 요청
   */
  public async requestPermission(): Promise<boolean> {
    try {
      if (!('Notification' in window)) {
        throw new Error('브라우저가 웹 알림을 지원하지 않습니다.');
      }

      if (this.permission === 'granted') {
        this.isEnabled = true;
        return true;
      }

      const permission = await Notification.requestPermission();
      this.permission = permission;
      this.isEnabled = permission === 'granted';

      if (this.isEnabled) {
        console.log('알림 권한이 허용되었습니다.');
        await this.saveSettings();
      } else {
        console.warn('알림 권한이 거부되었습니다.');
      }

      return this.isEnabled;
    } catch (error) {
      console.error('알림 권한 요청 실패:', error);
      return false;
    }
  }

  /**
   * 알림 전송
   */
  public async sendNotification(options: NotificationOptions): Promise<void> {
    try {
      if (!this.isEnabled || this.permission !== 'granted') {
        console.warn('알림이 비활성화되어 있거나 권한이 없습니다.');
        return;
      }

      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        data: options.data
      });

      // 클릭 이벤트 처리
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();
        
        // 알림 데이터에 따른 액션 처리
        if (options.data?.action) {
          this.handleNotificationAction(options.data.action);
        }
      };

      // 자동 닫기 (5초 후)
      setTimeout(() => {
        notification.close();
      }, 5000);

    } catch (error) {
      console.error('알림 전송 실패:', error);
    }
  }

  /**
   * 타입별 알림 전송
   */
  public async sendAlert(type: AlertType, data: any): Promise<void> {
    const alertInfo = this.getAlertInfo(type, data);
    
    if (!alertInfo) {
      return;
    }

    await this.sendNotification({
      title: alertInfo.title,
      body: alertInfo.body,
      icon: alertInfo.icon,
      tag: type,
      requireInteraction: alertInfo.requireInteraction,
      data: { type, ...data }
    });
  }

  /**
   * 알림 타입별 정보 생성
   */
  private getAlertInfo(type: AlertType, data: any): NotificationOptions | null {
    switch (type) {
      case 'order_filled':
        return {
          title: '📈 주문 체결',
          body: `${data.symbol} ${data.side === 'buy' ? '매수' : '매도'} ${data.quantity}주 체결`,
          icon: '/icons/order-filled.png',
          requireInteraction: true
        };

      case 'profit_target':
        return {
          title: '🎯 목표 수익 달성',
          body: `${data.symbol} 수익률 ${data.profitRate}% 달성`,
          icon: '/icons/profit.png',
          requireInteraction: true
        };

      case 'stop_loss':
        return {
          title: '🛑 손절 실행',
          body: `${data.symbol} 손절가 도달로 매도 실행`,
          icon: '/icons/stop-loss.png',
          requireInteraction: true
        };

      case 'price_alert':
        if (!this.alertConfig.priceChange) return null;
        return {
          title: '📊 가격 알림',
          body: `${data.symbol} 가격 ${data.changeRate}% 변동`,
          icon: '/icons/price-alert.png'
        };

      case 'system_error':
        if (!this.alertConfig.systemError) return null;
        return {
          title: '⚠️ 시스템 오류',
          body: `매매 시스템에 오류가 발생했습니다: ${data.error}`,
          icon: '/icons/error.png',
          requireInteraction: true
        };

      case 'server_down':
        if (!this.alertConfig.serverStatus) return null;
        return {
          title: '🔴 서버 연결 끊김',
          body: '매매 서버와의 연결이 끊어졌습니다. 확인이 필요합니다.',
          icon: '/icons/server-down.png',
          requireInteraction: true
        };

      case 'trading_stopped':
        return {
          title: '⏹️ 매매 중지',
          body: `${data.reason || '알 수 없는 이유'}로 자동매매가 중지되었습니다.`,
          icon: '/icons/trading-stopped.png',
          requireInteraction: true
        };

      case 'daily_summary':
        return {
          title: '📋 일일 매매 요약',
          body: `총 수익률: ${data.totalReturn}%, 거래 횟수: ${data.tradeCount}회`,
          icon: '/icons/daily-summary.png'
        };

      default:
        return null;
    }
  }

  /**
   * 알림 클릭 액션 처리
   */
  private handleNotificationAction(action: string): void {
    switch (action) {
      case 'open_trading':
        // 매매 화면으로 이동
        window.location.hash = '#/trading';
        break;
      case 'open_portfolio':
        // 포트폴리오 화면으로 이동
        window.location.hash = '#/portfolio';
        break;
      case 'open_alerts':
        // 알림 설정 화면으로 이동
        window.location.hash = '#/settings/alerts';
        break;
      default:
        // 기본적으로 대시보드로 이동
        window.location.hash = '#/dashboard';
    }
  }

  /**
   * 알림 설정 업데이트
   */
  public async updateAlertConfig(config: Partial<AlertConfig>): Promise<void> {
    try {
      this.alertConfig = { ...this.alertConfig, ...config };
      await this.saveSettings();
      console.log('알림 설정이 업데이트되었습니다.');
    } catch (error) {
      console.error('알림 설정 업데이트 실패:', error);
    }
  }

  /**
   * 현재 알림 설정 반환
   */
  public getAlertConfig(): AlertConfig {
    return { ...this.alertConfig };
  }

  /**
   * 알림 활성화/비활성화
   */
  public async setEnabled(enabled: boolean): Promise<void> {
    if (enabled && this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        throw new Error('알림 권한이 필요합니다.');
      }
    }
    
    this.isEnabled = enabled;
    await this.saveSettings();
  }

  /**
   * 알림 활성화 상태 확인
   */
  public isNotificationEnabled(): boolean {
    return this.isEnabled && this.permission === 'granted';
  }

  /**
   * 기본 설정 반환
   */
  private getDefaultConfig(): AlertConfig {
    return {
      priceChange: 5.0,      // 5% 가격 변동 시 알림
      profitLoss: 10.0,      // 10% 손익 시 알림
      orderExecution: true,   // 주문 체결 알림
      systemError: true,      // 시스템 오류 알림
      serverStatus: true      // 서버 상태 알림
    };
  }

  /**
   * 설정 저장
   */
  private async saveSettings(): Promise<void> {
    try {
      const settings = {
        isEnabled: this.isEnabled,
        alertConfig: this.alertConfig,
        permission: this.permission
      };
      
      localStorage.setItem('notification_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('알림 설정 저장 실패:', error);
    }
  }

  /**
   * 설정 로드
   */
  private async loadSettings(): Promise<void> {
    try {
      const saved = localStorage.getItem('notification_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.isEnabled = settings.isEnabled || false;
        this.alertConfig = { ...this.getDefaultConfig(), ...settings.alertConfig };
        this.permission = settings.permission || 'default';
      }
    } catch (error) {
      console.error('알림 설정 로드 실패:', error);
      // 기본 설정으로 초기화
      this.alertConfig = this.getDefaultConfig();
    }
  }

  /**
   * 테스트 알림 전송
   */
  public async sendTestNotification(): Promise<void> {
    await this.sendNotification({
      title: '🔔 알림 테스트',
      body: 'KIS Quant 알림이 정상적으로 작동합니다.',
      icon: '/favicon.ico',
      tag: 'test'
    });
  }
}

// 싱글톤 인스턴스 내보내기
export const notificationService = NotificationService.getInstance();
export default NotificationService; 