"""
자동매매 봇 메인 로직
실시간 시세 조회, 매매 시그널 생성, KIS API를 통한 주문 실행
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import firebase_admin
from firebase_admin import credentials, firestore, db
import httpx
from decimal import Decimal
import json
import os
from dataclasses import dataclass, asdict
from enum import Enum

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OrderType(Enum):
    """주문 타입"""
    BUY = "buy"
    SELL = "sell"

class TradingStatus(Enum):
    """매매 상태"""
    ACTIVE = "active"      # 활성 상태
    PAUSED = "paused"      # 일시 중지
    STOPPED = "stopped"    # 완전 중지
    ERROR = "error"        # 오류 상태

@dataclass
class Position:
    """포지션 정보"""
    symbol: str              # 종목 코드
    quantity: int            # 보유 수량
    avg_price: Decimal       # 평균 단가
    current_price: Decimal   # 현재가
    unrealized_pnl: Decimal  # 미실현 손익
    realized_pnl: Decimal    # 실현 손익
    
@dataclass
class TradingSignal:
    """매매 신호"""
    symbol: str         # 종목 코드
    action: OrderType   # 매수/매도
    quantity: int       # 수량
    price: Decimal      # 가격
    confidence: float   # 신뢰도 (0-1)
    timestamp: datetime # 생성 시각
    reason: str         # 매매 근거

@dataclass
class Order:
    """주문 정보"""
    order_id: str       # 주문 ID
    symbol: str         # 종목 코드
    action: OrderType   # 매수/매도
    quantity: int       # 수량
    price: Decimal      # 주문 가격
    status: str         # 주문 상태
    timestamp: datetime # 주문 시각

class TradingBot:
    """자동매매 봇"""
    
    def __init__(self, config: Dict):
        """
        자동매매 봇 초기화
        
        Args:
            config: 매매 설정 정보
        """
        self.config = config
        self.user_id = config.get('user_id')
        self.strategy_id = config.get('strategy_id')
        self.status = TradingStatus.STOPPED
        self.positions: Dict[str, Position] = {}
        self.active_orders: Dict[str, Order] = {}
        self.trading_history: List[Dict] = []
        
        # Firebase 초기화
        self._init_firebase()
        
        # KIS API 클라이언트 초기화
        self.kis_client = None
        self._init_kis_client()
        
        logger.info(f"TradingBot 초기화 완료 - User: {self.user_id}, Strategy: {self.strategy_id}")

    def _init_firebase(self):
        """Firebase 초기화"""
        try:
            # Firebase 앱이 이미 초기화되어 있는지 확인
            if not firebase_admin._apps:
                # Firebase Admin SDK 초기화
                cred = credentials.Certificate(os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY'))
                firebase_admin.initialize_app(cred, {
                    'databaseURL': os.getenv('FIREBASE_DATABASE_URL')
                })
            
            self.firestore_db = firestore.client()
            self.realtime_db = db.reference()
            
            logger.info("Firebase 초기화 완료")
            
        except Exception as e:
            logger.error(f"Firebase 초기화 실패: {e}")
            raise

    def _init_kis_client(self):
        """KIS API 클라이언트 초기화"""
        try:
            # TODO: KIS API 클라이언트 구현
            # 실제 구현 시에는 KIS API 라이브러리 또는 HTTP 클라이언트를 사용
            self.kis_client = httpx.AsyncClient(
                base_url="https://openapi.koreainvestment.com",
                timeout=30.0
            )
            logger.info("KIS API 클라이언트 초기화 완료")
            
        except Exception as e:
            logger.error(f"KIS API 클라이언트 초기화 실패: {e}")
            raise

    async def start_trading(self):
        """자동매매 시작"""
        try:
            if self.status == TradingStatus.ACTIVE:
                logger.warning("이미 매매가 실행 중입니다.")
                return
                
            self.status = TradingStatus.ACTIVE
            logger.info("자동매매 시작")
            
            # Firebase에 상태 업데이트
            await self._update_status_to_firebase()
            
            # 매매 루프 시작
            await self._trading_loop()
            
        except Exception as e:
            logger.error(f"자동매매 시작 실패: {e}")
            self.status = TradingStatus.ERROR
            await self._update_status_to_firebase()
            raise

    async def stop_trading(self):
        """자동매매 중지"""
        try:
            self.status = TradingStatus.STOPPED
            logger.info("자동매매 중지")
            
            # 진행 중인 주문 취소
            await self._cancel_all_orders()
            
            # Firebase에 상태 업데이트
            await self._update_status_to_firebase()
            
        except Exception as e:
            logger.error(f"자동매매 중지 실패: {e}")
            raise

    async def pause_trading(self):
        """자동매매 일시 중지"""
        self.status = TradingStatus.PAUSED
        logger.info("자동매매 일시 중지")
        await self._update_status_to_firebase()

    async def resume_trading(self):
        """자동매매 재시작"""
        if self.status == TradingStatus.PAUSED:
            self.status = TradingStatus.ACTIVE
            logger.info("자동매매 재시작")
            await self._update_status_to_firebase()

    async def _trading_loop(self):
        """메인 매매 루프"""
        while self.status == TradingStatus.ACTIVE:
            try:
                # 시장 개장 시간 확인
                if not self._is_market_open():
                    await asyncio.sleep(60)  # 1분 대기
                    continue
                
                # 전략 실행
                signals = await self._generate_trading_signals()
                
                # 매매 시그널 처리
                for signal in signals:
                    if self.status != TradingStatus.ACTIVE:
                        break
                    await self._process_trading_signal(signal)
                
                # 포지션 업데이트
                await self._update_positions()
                
                # Firebase에 데이터 동기화
                await self._sync_to_firebase()
                
                # 대기 (설정에 따라 조정 가능)
                await asyncio.sleep(self.config.get('check_interval', 30))
                
            except Exception as e:
                logger.error(f"매매 루프 오류: {e}")
                self.status = TradingStatus.ERROR
                await self._update_status_to_firebase()
                break

    def _is_market_open(self) -> bool:
        """시장 개장 시간 확인"""
        now = datetime.now()
        
        # 주말 확인
        if now.weekday() >= 5:  # 토요일(5), 일요일(6)
            return False
            
        # 개장 시간 확인 (9:00 ~ 15:30)
        market_open = now.replace(hour=9, minute=0, second=0, microsecond=0)
        market_close = now.replace(hour=15, minute=30, second=0, microsecond=0)
        
        return market_open <= now <= market_close

    async def _generate_trading_signals(self) -> List[TradingSignal]:
        """매매 시그널 생성"""
        signals = []
        
        try:
            # 전략 정보 조회
            strategy = await self._get_strategy_from_firebase()
            if not strategy:
                return signals
            
            # 감시 종목들에 대해 시그널 검사
            for target in strategy.get('targets', []):
                symbol = target.get('symbol')
                if not symbol:
                    continue
                
                # 현재 시세 조회
                current_price = await self._get_current_price(symbol)
                if not current_price:
                    continue
                
                # 매수 조건 확인
                buy_signal = await self._check_buy_conditions(symbol, current_price, strategy)
                if buy_signal:
                    signals.append(buy_signal)
                
                # 매도 조건 확인 (보유 중인 경우)
                if symbol in self.positions:
                    sell_signal = await self._check_sell_conditions(symbol, current_price, strategy)
                    if sell_signal:
                        signals.append(sell_signal)
                        
        except Exception as e:
            logger.error(f"매매 시그널 생성 오류: {e}")
            
        return signals

    async def _process_trading_signal(self, signal: TradingSignal):
        """매매 시그널 처리"""
        try:
            # 위험 관리 검사
            if not await self._risk_check(signal):
                logger.warning(f"위험 관리 규칙으로 인해 매매 신호 거부: {signal.symbol}")
                return
            
            # 주문 실행
            order = await self._place_order(signal)
            if order:
                self.active_orders[order.order_id] = order
                
                # 거래 내역 기록
                trade_record = {
                    'timestamp': signal.timestamp.isoformat(),
                    'symbol': signal.symbol,
                    'action': signal.action.value,
                    'quantity': signal.quantity,
                    'price': float(signal.price),
                    'reason': signal.reason,
                    'order_id': order.order_id
                }
                self.trading_history.append(trade_record)
                
                logger.info(f"주문 실행: {signal.symbol} {signal.action.value} {signal.quantity}주 @ {signal.price}")
                
        except Exception as e:
            logger.error(f"매매 시그널 처리 오류: {e}")

    async def _get_current_price(self, symbol: str) -> Optional[Decimal]:
        """현재가 조회"""
        try:
            # TODO: KIS API를 통한 실시간 시세 조회 구현
            # 현재는 임시로 더미 데이터 반환
            return Decimal('50000')  # 임시 가격
            
        except Exception as e:
            logger.error(f"현재가 조회 오류 ({symbol}): {e}")
            return None

    async def _check_buy_conditions(self, symbol: str, price: Decimal, strategy: Dict) -> Optional[TradingSignal]:
        """매수 조건 확인"""
        try:
            # 전략의 매수 조건 검사
            buy_conditions = strategy.get('buyConditions', {})
            
            # TODO: 실제 기술지표 기반 매수 조건 검사 구현
            # 현재는 단순한 예시
            if price < Decimal('55000'):  # 임시 조건
                return TradingSignal(
                    symbol=symbol,
                    action=OrderType.BUY,
                    quantity=1,  # 임시 수량
                    price=price,
                    confidence=0.8,
                    timestamp=datetime.now(),
                    reason="가격 하락으로 매수 조건 만족"
                )
                
        except Exception as e:
            logger.error(f"매수 조건 확인 오류 ({symbol}): {e}")
            
        return None

    async def _check_sell_conditions(self, symbol: str, price: Decimal, strategy: Dict) -> Optional[TradingSignal]:
        """매도 조건 확인"""
        try:
            position = self.positions.get(symbol)
            if not position:
                return None
                
            # 전략의 매도 조건 검사
            sell_conditions = strategy.get('sellConditions', {})
            
            # TODO: 실제 기술지표 기반 매도 조건 검사 구현
            # 현재는 단순한 예시
            profit_rate = (price - position.avg_price) / position.avg_price
            if profit_rate > Decimal('0.05'):  # 5% 수익률
                return TradingSignal(
                    symbol=symbol,
                    action=OrderType.SELL,
                    quantity=position.quantity,
                    price=price,
                    confidence=0.9,
                    timestamp=datetime.now(),
                    reason="목표 수익률 달성으로 매도"
                )
                
        except Exception as e:
            logger.error(f"매도 조건 확인 오류 ({symbol}): {e}")
            
        return None

    async def _risk_check(self, signal: TradingSignal) -> bool:
        """위험 관리 검사"""
        try:
            # 일일 매매 한도 확인
            daily_trades = len([t for t in self.trading_history 
                              if datetime.fromisoformat(t['timestamp']).date() == datetime.now().date()])
            if daily_trades >= self.config.get('max_daily_trades', 10):
                logger.warning("일일 매매 한도 초과")
                return False
            
            # 포지션 집중도 확인
            if signal.action == OrderType.BUY:
                total_investment = sum(pos.quantity * pos.avg_price for pos in self.positions.values())
                new_investment = signal.quantity * signal.price
                max_investment = Decimal(self.config.get('max_total_investment', 1000000))
                
                if total_investment + new_investment > max_investment:
                    logger.warning("최대 투자 한도 초과")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"위험 관리 검사 오류: {e}")
            return False

    async def _place_order(self, signal: TradingSignal) -> Optional[Order]:
        """주문 실행"""
        try:
            # TODO: 실제 KIS API를 통한 주문 실행 구현
            # 현재는 임시로 더미 주문 생성
            order_id = f"ORD_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{signal.symbol}"
            
            order = Order(
                order_id=order_id,
                symbol=signal.symbol,
                action=signal.action,
                quantity=signal.quantity,
                price=signal.price,
                status="PENDING",
                timestamp=datetime.now()
            )
            
            logger.info(f"주문 생성: {order_id}")
            return order
            
        except Exception as e:
            logger.error(f"주문 실행 오류: {e}")
            return None

    async def _update_positions(self):
        """포지션 업데이트"""
        try:
            # 체결된 주문 확인 및 포지션 업데이트
            for order_id, order in list(self.active_orders.items()):
                # TODO: KIS API를 통한 주문 상태 확인
                # 현재는 임시로 체결 처리
                if order.status == "PENDING":
                    order.status = "FILLED"
                    
                    # 포지션 업데이트
                    await self._update_position_from_order(order)
                    
                    # 체결된 주문 제거
                    del self.active_orders[order_id]
                    
        except Exception as e:
            logger.error(f"포지션 업데이트 오류: {e}")

    async def _update_position_from_order(self, order: Order):
        """주문으로부터 포지션 업데이트"""
        try:
            symbol = order.symbol
            
            if symbol not in self.positions:
                # 새 포지션 생성
                if order.action == OrderType.BUY:
                    self.positions[symbol] = Position(
                        symbol=symbol,
                        quantity=order.quantity,
                        avg_price=order.price,
                        current_price=order.price,
                        unrealized_pnl=Decimal('0'),
                        realized_pnl=Decimal('0')
                    )
            else:
                # 기존 포지션 업데이트
                position = self.positions[symbol]
                
                if order.action == OrderType.BUY:
                    # 매수: 평균 단가 재계산
                    total_quantity = position.quantity + order.quantity
                    total_value = (position.quantity * position.avg_price) + (order.quantity * order.price)
                    position.avg_price = total_value / total_quantity
                    position.quantity = total_quantity
                    
                elif order.action == OrderType.SELL:
                    # 매도: 실현 손익 계산
                    realized_pnl = (order.price - position.avg_price) * order.quantity
                    position.realized_pnl += realized_pnl
                    position.quantity -= order.quantity
                    
                    # 전량 매도 시 포지션 제거
                    if position.quantity <= 0:
                        del self.positions[symbol]
                        
        except Exception as e:
            logger.error(f"포지션 업데이트 오류: {e}")

    async def _cancel_all_orders(self):
        """모든 진행 중인 주문 취소"""
        try:
            for order_id, order in self.active_orders.items():
                # TODO: KIS API를 통한 주문 취소
                logger.info(f"주문 취소: {order_id}")
                
            self.active_orders.clear()
            
        except Exception as e:
            logger.error(f"주문 취소 오류: {e}")

    async def _get_strategy_from_firebase(self) -> Optional[Dict]:
        """Firebase에서 전략 정보 조회"""
        try:
            doc_ref = self.firestore_db.collection('users').document(self.user_id)\
                                      .collection('strategies').document(self.strategy_id)
            doc = doc_ref.get()
            
            if doc.exists:
                return doc.to_dict()
            return None
            
        except Exception as e:
            logger.error(f"전략 조회 오류: {e}")
            return None

    async def _update_status_to_firebase(self):
        """Firebase에 상태 업데이트"""
        try:
            ref = self.realtime_db.child('trading_bots').child(self.user_id).child(self.strategy_id)
            ref.update({
                'status': self.status.value,
                'last_update': datetime.now().isoformat(),
                'active_orders_count': len(self.active_orders),
                'positions_count': len(self.positions)
            })
            
        except Exception as e:
            logger.error(f"상태 업데이트 오류: {e}")

    async def _sync_to_firebase(self):
        """Firebase에 전체 데이터 동기화"""
        try:
            ref = self.realtime_db.child('trading_bots').child(self.user_id).child(self.strategy_id)
            
            # 포지션 데이터 변환
            positions_data = {}
            for symbol, position in self.positions.items():
                positions_data[symbol] = {
                    'symbol': position.symbol,
                    'quantity': position.quantity,
                    'avg_price': float(position.avg_price),
                    'current_price': float(position.current_price),
                    'unrealized_pnl': float(position.unrealized_pnl),
                    'realized_pnl': float(position.realized_pnl)
                }
            
            # 활성 주문 데이터 변환
            orders_data = {}
            for order_id, order in self.active_orders.items():
                orders_data[order_id] = {
                    'order_id': order.order_id,
                    'symbol': order.symbol,
                    'action': order.action.value,
                    'quantity': order.quantity,
                    'price': float(order.price),
                    'status': order.status,
                    'timestamp': order.timestamp.isoformat()
                }
            
            # 데이터 업데이트
            ref.update({
                'status': self.status.value,
                'last_update': datetime.now().isoformat(),
                'positions': positions_data,
                'active_orders': orders_data,
                'trading_history': self.trading_history[-100:]  # 최근 100개만 보관
            })
            
        except Exception as e:
            logger.error(f"Firebase 동기화 오류: {e}")

    async def get_status(self) -> Dict:
        """현재 상태 반환"""
        return {
            'status': self.status.value,
            'positions_count': len(self.positions),
            'active_orders_count': len(self.active_orders),
            'total_trades': len(self.trading_history),
            'last_update': datetime.now().isoformat()
        }

    async def cleanup(self):
        """리소스 정리"""
        try:
            if self.kis_client:
                await self.kis_client.aclose()
            logger.info("TradingBot 리소스 정리 완료")
            
        except Exception as e:
            logger.error(f"리소스 정리 오류: {e}") 