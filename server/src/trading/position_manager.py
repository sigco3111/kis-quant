"""
포지션 관리 모듈
매수/매도에 따른 포지션 계산, 평균 단가 관리, 손익 계산
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from decimal import Decimal, ROUND_HALF_UP
from dataclasses import dataclass, asdict
from enum import Enum

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PositionType(Enum):
    """포지션 타입"""
    LONG = "long"    # 매수 포지션
    SHORT = "short"  # 매도 포지션 (현재 미지원)
    NONE = "none"    # 포지션 없음

@dataclass
class Transaction:
    """거래 기록"""
    transaction_id: str      # 거래 ID
    symbol: str             # 종목 코드
    action: str             # 매수/매도 (BUY/SELL)
    quantity: int           # 거래 수량
    price: Decimal          # 거래 가격
    fee: Decimal            # 거래 수수료
    timestamp: datetime     # 거래 시각
    order_id: str           # 주문 ID

@dataclass
class Position:
    """포지션 정보"""
    symbol: str                    # 종목 코드
    position_type: PositionType    # 포지션 타입
    quantity: int                  # 보유 수량
    avg_price: Decimal            # 평균 단가
    total_cost: Decimal           # 총 매수 금액
    current_price: Decimal        # 현재가
    market_value: Decimal         # 시가 총액
    unrealized_pnl: Decimal       # 미실현 손익
    unrealized_pnl_rate: Decimal  # 미실현 손익률
    realized_pnl: Decimal         # 실현 손익
    total_fee: Decimal            # 총 수수료
    first_buy_date: datetime      # 최초 매수일
    last_update: datetime         # 마지막 업데이트 시각

class PositionManager:
    """포지션 관리자"""
    
    def __init__(self, user_id: str):
        """
        포지션 관리자 초기화
        
        Args:
            user_id: 사용자 ID
        """
        self.user_id = user_id
        self.positions: Dict[str, Position] = {}
        self.transactions: List[Transaction] = []
        self.total_invested: Decimal = Decimal('0')
        self.total_realized_pnl: Decimal = Decimal('0')
        self.total_fees: Decimal = Decimal('0')
        
        logger.info(f"PositionManager 초기화 - User: {user_id}")

    def add_transaction(self, transaction: Transaction) -> bool:
        """
        거래 추가 및 포지션 업데이트
        
        Args:
            transaction: 거래 정보
            
        Returns:
            처리 성공 여부
        """
        try:
            # 거래 기록 추가
            self.transactions.append(transaction)
            
            # 포지션 업데이트
            self._update_position_from_transaction(transaction)
            
            logger.info(f"거래 추가 완료: {transaction.symbol} {transaction.action} "
                       f"{transaction.quantity}주 @ {transaction.price}")
            
            return True
            
        except Exception as e:
            logger.error(f"거래 추가 실패: {e}")
            return False

    def _update_position_from_transaction(self, transaction: Transaction):
        """거래로부터 포지션 업데이트"""
        symbol = transaction.symbol
        
        if symbol not in self.positions:
            # 신규 포지션 생성 (매수만 가능)
            if transaction.action == "BUY":
                self._create_new_position(transaction)
            else:
                logger.warning(f"보유하지 않은 종목의 매도 시도: {symbol}")
                return
        else:
            # 기존 포지션 업데이트
            self._update_existing_position(transaction)

    def _create_new_position(self, transaction: Transaction):
        """신규 포지션 생성"""
        try:
            total_cost = transaction.quantity * transaction.price + transaction.fee
            
            position = Position(
                symbol=transaction.symbol,
                position_type=PositionType.LONG,
                quantity=transaction.quantity,
                avg_price=transaction.price,
                total_cost=total_cost,
                current_price=transaction.price,
                market_value=transaction.quantity * transaction.price,
                unrealized_pnl=Decimal('0'),
                unrealized_pnl_rate=Decimal('0'),
                realized_pnl=Decimal('0'),
                total_fee=transaction.fee,
                first_buy_date=transaction.timestamp,
                last_update=transaction.timestamp
            )
            
            self.positions[transaction.symbol] = position
            self.total_invested += total_cost
            self.total_fees += transaction.fee
            
            logger.info(f"신규 포지션 생성: {transaction.symbol}")
            
        except Exception as e:
            logger.error(f"신규 포지션 생성 실패: {e}")
            raise

    def _update_existing_position(self, transaction: Transaction):
        """기존 포지션 업데이트"""
        try:
            position = self.positions[transaction.symbol]
            
            if transaction.action == "BUY":
                # 매수: 평균 단가 재계산
                self._handle_buy_transaction(position, transaction)
                
            elif transaction.action == "SELL":
                # 매도: 실현 손익 계산
                self._handle_sell_transaction(position, transaction)
                
            position.last_update = transaction.timestamp
            self.total_fees += transaction.fee
            
        except Exception as e:
            logger.error(f"포지션 업데이트 실패: {e}")
            raise

    def _handle_buy_transaction(self, position: Position, transaction: Transaction):
        """매수 거래 처리"""
        # 새로운 평균 단가 계산
        total_quantity = position.quantity + transaction.quantity
        total_value = (position.quantity * position.avg_price) + \
                     (transaction.quantity * transaction.price)
        
        new_avg_price = total_value / total_quantity
        
        # 포지션 업데이트
        position.quantity = total_quantity
        position.avg_price = new_avg_price
        position.total_cost += transaction.quantity * transaction.price + transaction.fee
        position.total_fee += transaction.fee
        
        # 투자 총액 업데이트
        self.total_invested += transaction.quantity * transaction.price + transaction.fee
        
        logger.info(f"매수 처리: {transaction.symbol} 평균단가 {new_avg_price}")

    def _handle_sell_transaction(self, position: Position, transaction: Transaction):
        """매도 거래 처리"""
        if transaction.quantity > position.quantity:
            logger.error(f"매도 수량이 보유 수량보다 많습니다: {transaction.symbol}")
            raise ValueError("매도 수량 초과")
        
        # 실현 손익 계산 (수수료 고려)
        sell_proceeds = transaction.quantity * transaction.price - transaction.fee
        cost_basis = transaction.quantity * position.avg_price
        realized_pnl = sell_proceeds - cost_basis
        
        # 포지션 업데이트
        position.quantity -= transaction.quantity
        position.realized_pnl += realized_pnl
        position.total_cost -= cost_basis
        position.total_fee += transaction.fee
        
        # 전체 실현 손익 업데이트
        self.total_realized_pnl += realized_pnl
        
        # 전량 매도 시 포지션 제거
        if position.quantity == 0:
            logger.info(f"전량 매도로 포지션 제거: {transaction.symbol}")
            del self.positions[transaction.symbol]
        
        logger.info(f"매도 처리: {transaction.symbol} 실현손익 {realized_pnl}")

    def update_current_prices(self, price_data: Dict[str, Decimal]):
        """
        현재가 업데이트 및 미실현 손익 계산
        
        Args:
            price_data: {종목코드: 현재가} 딕셔너리
        """
        try:
            for symbol, current_price in price_data.items():
                if symbol in self.positions:
                    position = self.positions[symbol]
                    
                    # 현재가 업데이트
                    position.current_price = current_price
                    position.market_value = position.quantity * current_price
                    
                    # 미실현 손익 계산
                    cost_basis = position.quantity * position.avg_price
                    position.unrealized_pnl = position.market_value - cost_basis
                    
                    # 미실현 손익률 계산
                    if cost_basis > 0:
                        position.unrealized_pnl_rate = (position.unrealized_pnl / cost_basis) * 100
                    else:
                        position.unrealized_pnl_rate = Decimal('0')
                    
                    position.last_update = datetime.now()
            
        except Exception as e:
            logger.error(f"현재가 업데이트 실패: {e}")

    def get_position(self, symbol: str) -> Optional[Position]:
        """
        특정 종목의 포지션 조회
        
        Args:
            symbol: 종목 코드
            
        Returns:
            포지션 정보 또는 None
        """
        return self.positions.get(symbol)

    def get_all_positions(self) -> Dict[str, Position]:
        """모든 포지션 조회"""
        return self.positions.copy()

    def get_portfolio_summary(self) -> Dict:
        """포트폴리오 요약 정보"""
        try:
            total_market_value = Decimal('0')
            total_unrealized_pnl = Decimal('0')
            position_count = len(self.positions)
            
            for position in self.positions.values():
                total_market_value += position.market_value
                total_unrealized_pnl += position.unrealized_pnl
            
            # 총 수익률 계산
            total_pnl = self.total_realized_pnl + total_unrealized_pnl
            total_return_rate = Decimal('0')
            
            if self.total_invested > 0:
                total_return_rate = (total_pnl / self.total_invested) * 100
            
            return {
                'user_id': self.user_id,
                'position_count': position_count,
                'total_invested': float(self.total_invested),
                'total_market_value': float(total_market_value),
                'total_realized_pnl': float(self.total_realized_pnl),
                'total_unrealized_pnl': float(total_unrealized_pnl),
                'total_pnl': float(total_pnl),
                'total_return_rate': float(total_return_rate),
                'total_fees': float(self.total_fees),
                'last_update': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"포트폴리오 요약 생성 실패: {e}")
            return {}

    def get_transactions_by_symbol(self, symbol: str) -> List[Transaction]:
        """특정 종목의 거래 내역 조회"""
        return [t for t in self.transactions if t.symbol == symbol]

    def get_transactions_by_date_range(self, start_date: datetime, end_date: datetime) -> List[Transaction]:
        """기간별 거래 내역 조회"""
        return [t for t in self.transactions 
                if start_date <= t.timestamp <= end_date]

    def calculate_position_metrics(self, symbol: str) -> Optional[Dict]:
        """
        특정 포지션의 상세 메트릭 계산
        
        Args:
            symbol: 종목 코드
            
        Returns:
            포지션 메트릭 정보
        """
        try:
            position = self.positions.get(symbol)
            if not position:
                return None
            
            transactions = self.get_transactions_by_symbol(symbol)
            
            # 매수/매도 거래 분리
            buy_transactions = [t for t in transactions if t.action == "BUY"]
            sell_transactions = [t for t in transactions if t.action == "SELL"]
            
            # 총 매수/매도 수량 및 금액
            total_buy_quantity = sum(t.quantity for t in buy_transactions)
            total_sell_quantity = sum(t.quantity for t in sell_transactions)
            total_buy_amount = sum(t.quantity * t.price for t in buy_transactions)
            total_sell_amount = sum(t.quantity * t.price for t in sell_transactions)
            
            # 보유 기간 계산
            holding_days = 0
            if position.first_buy_date:
                holding_days = (datetime.now() - position.first_buy_date).days
            
            return {
                'symbol': symbol,
                'position_type': position.position_type.value,
                'current_quantity': position.quantity,
                'avg_price': float(position.avg_price),
                'current_price': float(position.current_price),
                'market_value': float(position.market_value),
                'total_cost': float(position.total_cost),
                'unrealized_pnl': float(position.unrealized_pnl),
                'unrealized_pnl_rate': float(position.unrealized_pnl_rate),
                'realized_pnl': float(position.realized_pnl),
                'total_buy_quantity': total_buy_quantity,
                'total_sell_quantity': total_sell_quantity,
                'total_buy_amount': float(total_buy_amount),
                'total_sell_amount': float(total_sell_amount),
                'total_fee': float(position.total_fee),
                'holding_days': holding_days,
                'first_buy_date': position.first_buy_date.isoformat(),
                'last_update': position.last_update.isoformat()
            }
            
        except Exception as e:
            logger.error(f"포지션 메트릭 계산 실패: {e}")
            return None

    def can_sell(self, symbol: str, quantity: int) -> bool:
        """
        매도 가능 여부 확인
        
        Args:
            symbol: 종목 코드
            quantity: 매도하려는 수량
            
        Returns:
            매도 가능 여부
        """
        position = self.positions.get(symbol)
        if not position:
            return False
        
        return position.quantity >= quantity

    def get_available_quantity(self, symbol: str) -> int:
        """
        매도 가능 수량 조회
        
        Args:
            symbol: 종목 코드
            
        Returns:
            매도 가능 수량
        """
        position = self.positions.get(symbol)
        return position.quantity if position else 0

    def calculate_fees(self, transaction_amount: Decimal, fee_rate: Decimal = Decimal('0.00015')) -> Decimal:
        """
        거래 수수료 계산
        
        Args:
            transaction_amount: 거래 금액
            fee_rate: 수수료율 (기본 0.015%)
            
        Returns:
            계산된 수수료
        """
        fee = transaction_amount * fee_rate
        # 원 단위로 반올림
        return fee.quantize(Decimal('1'), rounding=ROUND_HALF_UP)

    def export_positions_to_dict(self) -> Dict:
        """포지션 정보를 딕셔너리로 내보내기"""
        try:
            positions_dict = {}
            
            for symbol, position in self.positions.items():
                positions_dict[symbol] = {
                    'symbol': position.symbol,
                    'position_type': position.position_type.value,
                    'quantity': position.quantity,
                    'avg_price': float(position.avg_price),
                    'total_cost': float(position.total_cost),
                    'current_price': float(position.current_price),
                    'market_value': float(position.market_value),
                    'unrealized_pnl': float(position.unrealized_pnl),
                    'unrealized_pnl_rate': float(position.unrealized_pnl_rate),
                    'realized_pnl': float(position.realized_pnl),
                    'total_fee': float(position.total_fee),
                    'first_buy_date': position.first_buy_date.isoformat(),
                    'last_update': position.last_update.isoformat()
                }
            
            return positions_dict
            
        except Exception as e:
            logger.error(f"포지션 내보내기 실패: {e}")
            return {}

    def import_positions_from_dict(self, positions_data: Dict):
        """딕셔너리에서 포지션 정보 가져오기"""
        try:
            for symbol, data in positions_data.items():
                position = Position(
                    symbol=data['symbol'],
                    position_type=PositionType(data['position_type']),
                    quantity=data['quantity'],
                    avg_price=Decimal(str(data['avg_price'])),
                    total_cost=Decimal(str(data['total_cost'])),
                    current_price=Decimal(str(data['current_price'])),
                    market_value=Decimal(str(data['market_value'])),
                    unrealized_pnl=Decimal(str(data['unrealized_pnl'])),
                    unrealized_pnl_rate=Decimal(str(data['unrealized_pnl_rate'])),
                    realized_pnl=Decimal(str(data['realized_pnl'])),
                    total_fee=Decimal(str(data['total_fee'])),
                    first_buy_date=datetime.fromisoformat(data['first_buy_date']),
                    last_update=datetime.fromisoformat(data['last_update'])
                )
                
                self.positions[symbol] = position
            
            logger.info(f"포지션 데이터 가져오기 완료: {len(positions_data)}개")
            
        except Exception as e:
            logger.error(f"포지션 가져오기 실패: {e}")
            raise

    def reset_positions(self):
        """모든 포지션 초기화"""
        self.positions.clear()
        self.transactions.clear()
        self.total_invested = Decimal('0')
        self.total_realized_pnl = Decimal('0')
        self.total_fees = Decimal('0')
        
        logger.info("모든 포지션 초기화 완료") 