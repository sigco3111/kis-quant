"""
위험 관리 모듈
최대 손실 한도, 포지션 크기 제한, 일일 거래 한도 등의 위험 관리
"""

import logging
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Tuple
from decimal import Decimal
from dataclasses import dataclass
from enum import Enum

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RiskLevel(Enum):
    """위험 수준"""
    LOW = "low"          # 낮음
    MEDIUM = "medium"    # 보통
    HIGH = "high"        # 높음
    CRITICAL = "critical" # 매우 높음

class RiskType(Enum):
    """위험 유형"""
    POSITION_SIZE = "position_size"        # 포지션 크기
    DAILY_LOSS = "daily_loss"             # 일일 손실
    TOTAL_LOSS = "total_loss"             # 총 손실
    CONCENTRATION = "concentration"        # 집중도
    LEVERAGE = "leverage"                 # 레버리지
    VOLATILITY = "volatility"             # 변동성
    CORRELATION = "correlation"           # 상관관계

@dataclass
class RiskRule:
    """위험 관리 규칙"""
    rule_id: str                # 규칙 ID
    risk_type: RiskType         # 위험 유형
    threshold: Decimal          # 임계값
    action: str                 # 조치 (WARN, BLOCK, LIQUIDATE)
    description: str            # 설명
    is_active: bool = True      # 활성화 여부

@dataclass
class RiskAlert:
    """위험 알림"""
    alert_id: str               # 알림 ID
    risk_type: RiskType         # 위험 유형
    risk_level: RiskLevel       # 위험 수준
    current_value: Decimal      # 현재 값
    threshold: Decimal          # 임계값
    message: str                # 메시지
    timestamp: datetime         # 발생 시각
    is_resolved: bool = False   # 해결 여부

class RiskManager:
    """위험 관리자"""
    
    def __init__(self, user_id: str, config: Dict = None):
        """
        위험 관리자 초기화
        
        Args:
            user_id: 사용자 ID
            config: 위험 관리 설정
        """
        self.user_id = user_id
        self.config = config or {}
        self.risk_rules: Dict[str, RiskRule] = {}
        self.risk_alerts: List[RiskAlert] = []
        self.daily_stats: Dict[str, Dict] = {}  # {날짜: 통계}
        
        # 기본 위험 관리 규칙 설정
        self._setup_default_rules()
        
        logger.info(f"RiskManager 초기화 - User: {user_id}")

    def _setup_default_rules(self):
        """기본 위험 관리 규칙 설정"""
        try:
            # 기본 설정값
            max_position_size = Decimal(self.config.get('max_position_size', '100000'))      # 최대 포지션 크기
            max_daily_loss = Decimal(self.config.get('max_daily_loss', '50000'))            # 일일 최대 손실
            max_total_loss = Decimal(self.config.get('max_total_loss', '200000'))           # 총 최대 손실
            max_concentration = Decimal(self.config.get('max_concentration', '30'))          # 최대 집중도 (%)
            
            # 기본 위험 관리 규칙 생성
            default_rules = [
                RiskRule(
                    rule_id="max_position_size",
                    risk_type=RiskType.POSITION_SIZE,
                    threshold=max_position_size,
                    action="BLOCK",
                    description=f"단일 포지션 최대 크기 {max_position_size}원 초과 시 차단"
                ),
                RiskRule(
                    rule_id="daily_loss_limit",
                    risk_type=RiskType.DAILY_LOSS,
                    threshold=max_daily_loss,
                    action="LIQUIDATE",
                    description=f"일일 손실 {max_daily_loss}원 초과 시 전량 청산"
                ),
                RiskRule(
                    rule_id="total_loss_limit",
                    risk_type=RiskType.TOTAL_LOSS,
                    threshold=max_total_loss,
                    action="LIQUIDATE",
                    description=f"총 손실 {max_total_loss}원 초과 시 전량 청산"
                ),
                RiskRule(
                    rule_id="concentration_limit",
                    risk_type=RiskType.CONCENTRATION,
                    threshold=max_concentration,
                    action="WARN",
                    description=f"단일 종목 집중도 {max_concentration}% 초과 시 경고"
                )
            ]
            
            for rule in default_rules:
                self.risk_rules[rule.rule_id] = rule
            
            logger.info(f"기본 위험 관리 규칙 설정 완료: {len(default_rules)}개")
            
        except Exception as e:
            logger.error(f"기본 위험 관리 규칙 설정 실패: {e}")
            raise

    def add_risk_rule(self, rule: RiskRule) -> bool:
        """
        위험 관리 규칙 추가
        
        Args:
            rule: 위험 관리 규칙
            
        Returns:
            추가 성공 여부
        """
        try:
            self.risk_rules[rule.rule_id] = rule
            logger.info(f"위험 관리 규칙 추가: {rule.rule_id}")
            return True
            
        except Exception as e:
            logger.error(f"위험 관리 규칙 추가 실패: {e}")
            return False

    def remove_risk_rule(self, rule_id: str) -> bool:
        """
        위험 관리 규칙 제거
        
        Args:
            rule_id: 규칙 ID
            
        Returns:
            제거 성공 여부
        """
        try:
            if rule_id in self.risk_rules:
                del self.risk_rules[rule_id]
                logger.info(f"위험 관리 규칙 제거: {rule_id}")
                return True
            else:
                logger.warning(f"존재하지 않는 규칙 ID: {rule_id}")
                return False
                
        except Exception as e:
            logger.error(f"위험 관리 규칙 제거 실패: {e}")
            return False

    def check_order_risk(self, symbol: str, action: str, quantity: int, price: Decimal, 
                        current_positions: Dict, current_balance: Decimal) -> Tuple[bool, List[str]]:
        """
        주문 위험 검사
        
        Args:
            symbol: 종목 코드
            action: 매수/매도 (BUY/SELL)
            quantity: 수량
            price: 가격
            current_positions: 현재 포지션
            current_balance: 현재 잔고
            
        Returns:
            (승인 여부, 위험 메시지 목록)
        """
        risk_messages = []
        is_approved = True
        
        try:
            order_value = quantity * price
            
            # 매수 주문의 경우 추가 검사
            if action == "BUY":
                # 포지션 크기 검사
                if not self._check_position_size_risk(symbol, order_value, current_positions):
                    risk_messages.append(f"포지션 크기 한도 초과: {symbol}")
                    is_approved = False
                
                # 잔고 충분성 검사
                if not self._check_balance_sufficiency(order_value, current_balance):
                    risk_messages.append("잔고 부족")
                    is_approved = False
                
                # 집중도 검사
                concentration_risk = self._check_concentration_risk(symbol, order_value, current_positions)
                if concentration_risk:
                    risk_messages.append(concentration_risk)
                    # 집중도는 경고만 하고 차단하지 않음
            
            # 매도 주문의 경우
            elif action == "SELL":
                # 보유 수량 검사
                if not self._check_sell_quantity(symbol, quantity, current_positions):
                    risk_messages.append(f"매도 가능 수량 부족: {symbol}")
                    is_approved = False
            
            # 일일 거래 한도 검사
            if not self._check_daily_trading_limit():
                risk_messages.append("일일 거래 한도 초과")
                is_approved = False
            
            if not is_approved:
                logger.warning(f"주문 위험 검사 실패: {symbol} {action} {quantity}주 - {risk_messages}")
            
            return is_approved, risk_messages
            
        except Exception as e:
            logger.error(f"주문 위험 검사 오류: {e}")
            return False, [f"위험 검사 오류: {str(e)}"]

    def _check_position_size_risk(self, symbol: str, order_value: Decimal, current_positions: Dict) -> bool:
        """포지션 크기 위험 검사"""
        try:
            rule = self.risk_rules.get("max_position_size")
            if not rule or not rule.is_active:
                return True
            
            # 현재 포지션 가치 계산
            current_value = Decimal('0')
            if symbol in current_positions:
                position = current_positions[symbol]
                current_value = position.get('market_value', 0)
            
            # 주문 후 총 포지션 가치
            total_value = current_value + order_value
            
            if total_value > rule.threshold:
                self._create_risk_alert(
                    risk_type=RiskType.POSITION_SIZE,
                    current_value=total_value,
                    threshold=rule.threshold,
                    message=f"{symbol} 포지션 크기 한도 초과"
                )
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"포지션 크기 위험 검사 오류: {e}")
            return False

    def _check_balance_sufficiency(self, order_value: Decimal, current_balance: Decimal) -> bool:
        """잔고 충분성 검사"""
        try:
            # 수수료 고려 (0.015%)
            fee = order_value * Decimal('0.00015')
            total_required = order_value + fee
            
            # 안전 마진 (5%)
            safety_margin = current_balance * Decimal('0.05')
            available_balance = current_balance - safety_margin
            
            return total_required <= available_balance
            
        except Exception as e:
            logger.error(f"잔고 충분성 검사 오류: {e}")
            return False

    def _check_concentration_risk(self, symbol: str, order_value: Decimal, current_positions: Dict) -> Optional[str]:
        """집중도 위험 검사"""
        try:
            rule = self.risk_rules.get("concentration_limit")
            if not rule or not rule.is_active:
                return None
            
            # 전체 포트폴리오 가치 계산
            total_portfolio_value = sum(pos.get('market_value', 0) for pos in current_positions.values())
            total_portfolio_value += order_value
            
            if total_portfolio_value == 0:
                return None
            
            # 현재 포지션 가치
            current_value = Decimal('0')
            if symbol in current_positions:
                current_value = current_positions[symbol].get('market_value', 0)
            
            # 주문 후 해당 종목의 비중
            new_value = current_value + order_value
            concentration = (new_value / total_portfolio_value) * 100
            
            if concentration > rule.threshold:
                self._create_risk_alert(
                    risk_type=RiskType.CONCENTRATION,
                    current_value=concentration,
                    threshold=rule.threshold,
                    message=f"{symbol} 집중도 위험: {concentration:.1f}%"
                )
                return f"{symbol} 집중도 {concentration:.1f}% (한도: {rule.threshold}%)"
            
            return None
            
        except Exception as e:
            logger.error(f"집중도 위험 검사 오류: {e}")
            return None

    def _check_sell_quantity(self, symbol: str, quantity: int, current_positions: Dict) -> bool:
        """매도 수량 검사"""
        try:
            if symbol not in current_positions:
                return False
            
            available_quantity = current_positions[symbol].get('quantity', 0)
            return quantity <= available_quantity
            
        except Exception as e:
            logger.error(f"매도 수량 검사 오류: {e}")
            return False

    def _check_daily_trading_limit(self) -> bool:
        """일일 거래 한도 검사"""
        try:
            today = date.today().isoformat()
            daily_stats = self.daily_stats.get(today, {})
            
            # 일일 거래 횟수 확인
            daily_trades = daily_stats.get('trade_count', 0)
            max_daily_trades = int(self.config.get('max_daily_trades', 50))
            
            return daily_trades < max_daily_trades
            
        except Exception as e:
            logger.error(f"일일 거래 한도 검사 오류: {e}")
            return True  # 오류 시 허용

    def check_portfolio_risk(self, positions: Dict, total_pnl: Decimal) -> List[RiskAlert]:
        """
        포트폴리오 위험 검사
        
        Args:
            positions: 현재 포지션
            total_pnl: 총 손익
            
        Returns:
            위험 알림 목록
        """
        alerts = []
        
        try:
            # 일일 손실 검사
            daily_loss_alert = self._check_daily_loss_risk(total_pnl)
            if daily_loss_alert:
                alerts.append(daily_loss_alert)
            
            # 총 손실 검사
            total_loss_alert = self._check_total_loss_risk(total_pnl)
            if total_loss_alert:
                alerts.append(total_loss_alert)
            
            # 포지션별 위험 검사
            for symbol, position in positions.items():
                position_alerts = self._check_position_risk(symbol, position)
                alerts.extend(position_alerts)
            
            return alerts
            
        except Exception as e:
            logger.error(f"포트폴리오 위험 검사 오류: {e}")
            return []

    def _check_daily_loss_risk(self, total_pnl: Decimal) -> Optional[RiskAlert]:
        """일일 손실 위험 검사"""
        try:
            rule = self.risk_rules.get("daily_loss_limit")
            if not rule or not rule.is_active:
                return None
            
            today = date.today().isoformat()
            daily_stats = self.daily_stats.get(today, {})
            daily_pnl = daily_stats.get('pnl', Decimal('0'))
            
            # 손실이 임계값을 초과하는 경우
            if daily_pnl < -rule.threshold:
                return self._create_risk_alert(
                    risk_type=RiskType.DAILY_LOSS,
                    current_value=abs(daily_pnl),
                    threshold=rule.threshold,
                    message=f"일일 손실 한도 초과: {daily_pnl}원"
                )
            
            return None
            
        except Exception as e:
            logger.error(f"일일 손실 위험 검사 오류: {e}")
            return None

    def _check_total_loss_risk(self, total_pnl: Decimal) -> Optional[RiskAlert]:
        """총 손실 위험 검사"""
        try:
            rule = self.risk_rules.get("total_loss_limit")
            if not rule or not rule.is_active:
                return None
            
            # 총 손실이 임계값을 초과하는 경우
            if total_pnl < -rule.threshold:
                return self._create_risk_alert(
                    risk_type=RiskType.TOTAL_LOSS,
                    current_value=abs(total_pnl),
                    threshold=rule.threshold,
                    message=f"총 손실 한도 초과: {total_pnl}원"
                )
            
            return None
            
        except Exception as e:
            logger.error(f"총 손실 위험 검사 오류: {e}")
            return None

    def _check_position_risk(self, symbol: str, position: Dict) -> List[RiskAlert]:
        """개별 포지션 위험 검사"""
        alerts = []
        
        try:
            unrealized_pnl = position.get('unrealized_pnl', 0)
            unrealized_pnl_rate = position.get('unrealized_pnl_rate', 0)
            
            # 개별 포지션 손실 한도 검사 (포지션 가치의 20%)
            position_value = position.get('market_value', 0)
            max_position_loss = position_value * Decimal('0.2')
            
            if unrealized_pnl < -max_position_loss:
                alert = self._create_risk_alert(
                    risk_type=RiskType.POSITION_SIZE,
                    current_value=abs(unrealized_pnl),
                    threshold=max_position_loss,
                    message=f"{symbol} 포지션 손실 과다: {unrealized_pnl}원"
                )
                alerts.append(alert)
            
            # 포지션 손실률 검사 (15% 이상 손실)
            if unrealized_pnl_rate < -15:
                alert = self._create_risk_alert(
                    risk_type=RiskType.POSITION_SIZE,
                    current_value=abs(unrealized_pnl_rate),
                    threshold=Decimal('15'),
                    message=f"{symbol} 포지션 손실률 과다: {unrealized_pnl_rate:.1f}%"
                )
                alerts.append(alert)
            
            return alerts
            
        except Exception as e:
            logger.error(f"포지션 위험 검사 오류: {e}")
            return []

    def _create_risk_alert(self, risk_type: RiskType, current_value: Decimal, 
                          threshold: Decimal, message: str) -> RiskAlert:
        """위험 알림 생성"""
        try:
            # 위험 수준 결정
            risk_level = self._determine_risk_level(current_value, threshold)
            
            alert = RiskAlert(
                alert_id=f"{risk_type.value}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                risk_type=risk_type,
                risk_level=risk_level,
                current_value=current_value,
                threshold=threshold,
                message=message,
                timestamp=datetime.now()
            )
            
            self.risk_alerts.append(alert)
            logger.warning(f"위험 알림 생성: {message}")
            
            return alert
            
        except Exception as e:
            logger.error(f"위험 알림 생성 오류: {e}")
            raise

    def _determine_risk_level(self, current_value: Decimal, threshold: Decimal) -> RiskLevel:
        """위험 수준 결정"""
        try:
            if threshold == 0:
                return RiskLevel.LOW
            
            ratio = current_value / threshold
            
            if ratio >= 2.0:
                return RiskLevel.CRITICAL
            elif ratio >= 1.5:
                return RiskLevel.HIGH
            elif ratio >= 1.0:
                return RiskLevel.MEDIUM
            else:
                return RiskLevel.LOW
                
        except Exception as e:
            logger.error(f"위험 수준 결정 오류: {e}")
            return RiskLevel.LOW

    def update_daily_stats(self, trade_data: Dict):
        """일일 통계 업데이트"""
        try:
            today = date.today().isoformat()
            
            if today not in self.daily_stats:
                self.daily_stats[today] = {
                    'trade_count': 0,
                    'total_volume': Decimal('0'),
                    'pnl': Decimal('0'),
                    'fees': Decimal('0')
                }
            
            stats = self.daily_stats[today]
            stats['trade_count'] += 1
            stats['total_volume'] += trade_data.get('volume', 0)
            stats['pnl'] += trade_data.get('pnl', 0)
            stats['fees'] += trade_data.get('fee', 0)
            
        except Exception as e:
            logger.error(f"일일 통계 업데이트 오류: {e}")

    def get_risk_summary(self) -> Dict:
        """위험 요약 정보 조회"""
        try:
            # 최근 알림 (해결되지 않은 것)
            active_alerts = [alert for alert in self.risk_alerts if not alert.is_resolved]
            
            # 위험 수준별 분류
            risk_levels = {level.value: 0 for level in RiskLevel}
            for alert in active_alerts:
                risk_levels[alert.risk_level.value] += 1
            
            # 오늘 통계
            today = date.today().isoformat()
            today_stats = self.daily_stats.get(today, {})
            
            return {
                'user_id': self.user_id,
                'total_rules': len(self.risk_rules),
                'active_rules': len([r for r in self.risk_rules.values() if r.is_active]),
                'total_alerts': len(self.risk_alerts),
                'active_alerts': len(active_alerts),
                'risk_levels': risk_levels,
                'today_stats': {
                    'trade_count': today_stats.get('trade_count', 0),
                    'total_volume': float(today_stats.get('total_volume', 0)),
                    'pnl': float(today_stats.get('pnl', 0)),
                    'fees': float(today_stats.get('fees', 0))
                },
                'last_update': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"위험 요약 정보 조회 오류: {e}")
            return {}

    def resolve_alert(self, alert_id: str) -> bool:
        """알림 해결 처리"""
        try:
            for alert in self.risk_alerts:
                if alert.alert_id == alert_id:
                    alert.is_resolved = True
                    logger.info(f"위험 알림 해결 처리: {alert_id}")
                    return True
            
            logger.warning(f"존재하지 않는 알림 ID: {alert_id}")
            return False
            
        except Exception as e:
            logger.error(f"알림 해결 처리 오류: {e}")
            return False

    def get_trading_limits(self) -> Dict:
        """거래 한도 정보 조회"""
        try:
            today = date.today().isoformat()
            today_stats = self.daily_stats.get(today, {})
            
            max_daily_trades = int(self.config.get('max_daily_trades', 50))
            remaining_trades = max_daily_trades - today_stats.get('trade_count', 0)
            
            return {
                'max_position_size': float(self.config.get('max_position_size', 100000)),
                'max_daily_loss': float(self.config.get('max_daily_loss', 50000)),
                'max_total_loss': float(self.config.get('max_total_loss', 200000)),
                'max_concentration': float(self.config.get('max_concentration', 30)),
                'max_daily_trades': max_daily_trades,
                'remaining_trades': max(0, remaining_trades),
                'today_trade_count': today_stats.get('trade_count', 0),
                'today_pnl': float(today_stats.get('pnl', 0))
            }
            
        except Exception as e:
            logger.error(f"거래 한도 정보 조회 오류: {e}")
            return {}

    def cleanup_old_data(self, days_to_keep: int = 30):
        """오래된 데이터 정리"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days_to_keep)
            
            # 오래된 알림 제거
            self.risk_alerts = [alert for alert in self.risk_alerts 
                              if alert.timestamp > cutoff_date]
            
            # 오래된 일일 통계 제거
            cutoff_date_str = cutoff_date.date().isoformat()
            old_dates = [date_str for date_str in self.daily_stats.keys() 
                        if date_str < cutoff_date_str]
            
            for date_str in old_dates:
                del self.daily_stats[date_str]
            
            logger.info(f"오래된 데이터 정리 완료: {len(old_dates)}일치 데이터 삭제")
            
        except Exception as e:
            logger.error(f"오래된 데이터 정리 오류: {e}") 