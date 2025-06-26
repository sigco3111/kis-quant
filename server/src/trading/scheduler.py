"""
매매 스케줄러
정해진 시간에 매매 봇 시작/중지, 시장 시간 관리
"""

import asyncio
import logging
from datetime import datetime, time
from typing import Dict, List, Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
import pytz
from .bot import TradingBot, TradingStatus

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TradingScheduler:
    """매매 스케줄러"""
    
    def __init__(self):
        """스케줄러 초기화"""
        self.scheduler = AsyncIOScheduler(timezone=pytz.timezone('Asia/Seoul'))
        self.active_bots: Dict[str, TradingBot] = {}
        self.running = False
        
        logger.info("TradingScheduler 초기화 완료")

    async def start(self):
        """스케줄러 시작"""
        try:
            if self.running:
                logger.warning("스케줄러가 이미 실행 중입니다.")
                return
                
            # 기본 스케줄 등록
            await self._setup_default_schedules()
            
            # 스케줄러 시작
            self.scheduler.start()
            self.running = True
            
            logger.info("TradingScheduler 시작됨")
            
        except Exception as e:
            logger.error(f"스케줄러 시작 실패: {e}")
            raise

    async def stop(self):
        """스케줄러 중지"""
        try:
            if not self.running:
                return
                
            # 모든 활성 봇 중지
            await self._stop_all_bots()
            
            # 스케줄러 중지
            self.scheduler.shutdown(wait=True)
            self.running = False
            
            logger.info("TradingScheduler 중지됨")
            
        except Exception as e:
            logger.error(f"스케줄러 중지 실패: {e}")
            raise

    async def _setup_default_schedules(self):
        """기본 스케줄 설정"""
        try:
            # 매일 오전 8:50 - 매매 준비
            self.scheduler.add_job(
                self._prepare_trading,
                CronTrigger(hour=8, minute=50, second=0),
                id='prepare_trading',
                replace_existing=True
            )
            
            # 매일 오전 9:00 - 매매 시작
            self.scheduler.add_job(
                self._start_market_trading,
                CronTrigger(hour=9, minute=0, second=0),
                id='start_trading',
                replace_existing=True
            )
            
            # 매일 오후 3:30 - 매매 종료
            self.scheduler.add_job(
                self._end_market_trading,
                CronTrigger(hour=15, minute=30, second=0),
                id='end_trading',
                replace_existing=True
            )
            
            # 매일 오후 4:00 - 일일 정산
            self.scheduler.add_job(
                self._daily_settlement,
                CronTrigger(hour=16, minute=0, second=0),
                id='daily_settlement',
                replace_existing=True
            )
            
            # 매 10분마다 - 봇 상태 체크
            self.scheduler.add_job(
                self._check_bot_health,
                CronTrigger(minute='*/10'),
                id='health_check',
                replace_existing=True
            )
            
            logger.info("기본 스케줄 설정 완료")
            
        except Exception as e:
            logger.error(f"기본 스케줄 설정 실패: {e}")
            raise

    async def register_trading_bot(self, user_id: str, strategy_id: str, config: Dict):
        """매매 봇 등록"""
        try:
            bot_key = f"{user_id}_{strategy_id}"
            
            if bot_key in self.active_bots:
                logger.warning(f"봇이 이미 등록되어 있습니다: {bot_key}")
                return
            
            # 봇 생성
            bot_config = {
                'user_id': user_id,
                'strategy_id': strategy_id,
                **config
            }
            
            bot = TradingBot(bot_config)
            self.active_bots[bot_key] = bot
            
            logger.info(f"매매 봇 등록 완료: {bot_key}")
            
        except Exception as e:
            logger.error(f"매매 봇 등록 실패: {e}")
            raise

    async def unregister_trading_bot(self, user_id: str, strategy_id: str):
        """매매 봇 등록 해제"""
        try:
            bot_key = f"{user_id}_{strategy_id}"
            
            if bot_key not in self.active_bots:
                logger.warning(f"등록되지 않은 봇입니다: {bot_key}")
                return
            
            # 봇 중지 및 정리
            bot = self.active_bots[bot_key]
            await bot.stop_trading()
            await bot.cleanup()
            
            # 등록 해제
            del self.active_bots[bot_key]
            
            logger.info(f"매매 봇 등록 해제 완료: {bot_key}")
            
        except Exception as e:
            logger.error(f"매매 봇 등록 해제 실패: {e}")
            raise

    async def start_bot(self, user_id: str, strategy_id: str):
        """특정 봇 시작"""
        try:
            bot_key = f"{user_id}_{strategy_id}"
            
            if bot_key not in self.active_bots:
                logger.error(f"등록되지 않은 봇입니다: {bot_key}")
                return False
            
            bot = self.active_bots[bot_key]
            await bot.start_trading()
            
            logger.info(f"매매 봇 시작: {bot_key}")
            return True
            
        except Exception as e:
            logger.error(f"매매 봇 시작 실패: {e}")
            return False

    async def stop_bot(self, user_id: str, strategy_id: str):
        """특정 봇 중지"""
        try:
            bot_key = f"{user_id}_{strategy_id}"
            
            if bot_key not in self.active_bots:
                logger.error(f"등록되지 않은 봇입니다: {bot_key}")
                return False
            
            bot = self.active_bots[bot_key]
            await bot.stop_trading()
            
            logger.info(f"매매 봇 중지: {bot_key}")
            return True
            
        except Exception as e:
            logger.error(f"매매 봇 중지 실패: {e}")
            return False

    async def pause_bot(self, user_id: str, strategy_id: str):
        """특정 봇 일시 중지"""
        try:
            bot_key = f"{user_id}_{strategy_id}"
            
            if bot_key not in self.active_bots:
                logger.error(f"등록되지 않은 봇입니다: {bot_key}")
                return False
            
            bot = self.active_bots[bot_key]
            await bot.pause_trading()
            
            logger.info(f"매매 봇 일시 중지: {bot_key}")
            return True
            
        except Exception as e:
            logger.error(f"매매 봇 일시 중지 실패: {e}")
            return False

    async def resume_bot(self, user_id: str, strategy_id: str):
        """특정 봇 재시작"""
        try:
            bot_key = f"{user_id}_{strategy_id}"
            
            if bot_key not in self.active_bots:
                logger.error(f"등록되지 않은 봇입니다: {bot_key}")
                return False
            
            bot = self.active_bots[bot_key]
            await bot.resume_trading()
            
            logger.info(f"매매 봇 재시작: {bot_key}")
            return True
            
        except Exception as e:
            logger.error(f"매매 봇 재시작 실패: {e}")
            return False

    async def get_bot_status(self, user_id: str, strategy_id: str) -> Optional[Dict]:
        """봇 상태 조회"""
        try:
            bot_key = f"{user_id}_{strategy_id}"
            
            if bot_key not in self.active_bots:
                return None
            
            bot = self.active_bots[bot_key]
            return await bot.get_status()
            
        except Exception as e:
            logger.error(f"봇 상태 조회 실패: {e}")
            return None

    async def get_all_bots_status(self) -> Dict:
        """모든 봇 상태 조회"""
        try:
            status = {}
            
            for bot_key, bot in self.active_bots.items():
                status[bot_key] = await bot.get_status()
            
            return {
                'total_bots': len(self.active_bots),
                'bots': status,
                'scheduler_running': self.running
            }
            
        except Exception as e:
            logger.error(f"전체 봇 상태 조회 실패: {e}")
            return {}

    async def _prepare_trading(self):
        """매매 준비 (장 시작 10분 전)"""
        try:
            logger.info("매매 준비 시작 - 시스템 점검 및 데이터 준비")
            
            # 모든 봇의 상태 확인
            for bot_key, bot in self.active_bots.items():
                status = await bot.get_status()
                logger.info(f"봇 상태 - {bot_key}: {status['status']}")
            
            # TODO: 추가 준비 작업
            # - 시장 데이터 캐시 준비
            # - API 연결 상태 확인
            # - 매매 가능 자금 확인
            
            logger.info("매매 준비 완료")
            
        except Exception as e:
            logger.error(f"매매 준비 실패: {e}")

    async def _start_market_trading(self):
        """시장 개장 시 매매 시작"""
        try:
            # 오늘이 주말인지 확인
            if not self._is_trading_day():
                logger.info("오늘은 거래일이 아닙니다.")
                return
                
            logger.info("시장 개장 - 자동매매 시작")
            
            # 활성화된 모든 봇 시작
            for bot_key, bot in self.active_bots.items():
                try:
                    if bot.status == TradingStatus.STOPPED:
                        await bot.start_trading()
                        logger.info(f"봇 시작됨: {bot_key}")
                except Exception as e:
                    logger.error(f"봇 시작 실패 ({bot_key}): {e}")
            
        except Exception as e:
            logger.error(f"시장 개장 매매 시작 실패: {e}")

    async def _end_market_trading(self):
        """시장 종료 시 매매 중지"""
        try:
            logger.info("시장 종료 - 자동매매 중지")
            
            # 모든 봇 중지
            for bot_key, bot in self.active_bots.items():
                try:
                    if bot.status == TradingStatus.ACTIVE:
                        await bot.stop_trading()
                        logger.info(f"봇 중지됨: {bot_key}")
                except Exception as e:
                    logger.error(f"봇 중지 실패 ({bot_key}): {e}")
            
        except Exception as e:
            logger.error(f"시장 종료 매매 중지 실패: {e}")

    async def _daily_settlement(self):
        """일일 정산"""
        try:
            logger.info("일일 정산 시작")
            
            # 각 봇별 일일 실적 집계
            daily_summary = {}
            
            for bot_key, bot in self.active_bots.items():
                try:
                    status = await bot.get_status()
                    daily_summary[bot_key] = {
                        'total_trades': status.get('total_trades', 0),
                        'positions_count': status.get('positions_count', 0),
                        'status': status.get('status', 'unknown')
                    }
                except Exception as e:
                    logger.error(f"봇 정산 실패 ({bot_key}): {e}")
            
            logger.info(f"일일 정산 완료: {daily_summary}")
            
            # TODO: 추가 정산 작업
            # - 수익률 계산
            # - 리포트 생성
            # - 알림 발송
            
        except Exception as e:
            logger.error(f"일일 정산 실패: {e}")

    async def _check_bot_health(self):
        """봇 건강 상태 체크"""
        try:
            # 시장 시간이 아니면 스킵
            if not self._is_market_hours():
                return
                
            unhealthy_bots = []
            
            for bot_key, bot in self.active_bots.items():
                try:
                    status = await bot.get_status()
                    
                    # 에러 상태인 봇 체크
                    if status['status'] == 'error':
                        unhealthy_bots.append(bot_key)
                        logger.warning(f"봇 에러 상태 감지: {bot_key}")
                        
                        # TODO: 자동 복구 시도
                        # await self._recover_bot(bot_key)
                        
                except Exception as e:
                    logger.error(f"봇 상태 체크 실패 ({bot_key}): {e}")
                    unhealthy_bots.append(bot_key)
            
            if unhealthy_bots:
                logger.warning(f"비정상 봇 감지: {unhealthy_bots}")
            
        except Exception as e:
            logger.error(f"봇 건강 상태 체크 실패: {e}")

    async def _stop_all_bots(self):
        """모든 봇 중지"""
        try:
            for bot_key, bot in self.active_bots.items():
                try:
                    await bot.stop_trading()
                    await bot.cleanup()
                except Exception as e:
                    logger.error(f"봇 중지 실패 ({bot_key}): {e}")
            
            self.active_bots.clear()
            logger.info("모든 봇 중지 완료")
            
        except Exception as e:
            logger.error(f"모든 봇 중지 실패: {e}")

    def _is_trading_day(self) -> bool:
        """거래일 확인"""
        now = datetime.now()
        # 주말 제외
        return now.weekday() < 5

    def _is_market_hours(self) -> bool:
        """시장 시간 확인"""
        now = datetime.now()
        
        # 주말 확인
        if now.weekday() >= 5:
            return False
            
        # 시장 시간 확인 (9:00 ~ 15:30)
        current_time = now.time()
        market_open = time(9, 0)
        market_close = time(15, 30)
        
        return market_open <= current_time <= market_close

    async def schedule_one_time_action(self, run_date: datetime, action: str, bot_key: str):
        """일회성 작업 스케줄링"""
        try:
            job_id = f"{action}_{bot_key}_{run_date.strftime('%Y%m%d_%H%M%S')}"
            
            if action == 'start':
                self.scheduler.add_job(
                    self._execute_start_action,
                    DateTrigger(run_date=run_date),
                    args=[bot_key],
                    id=job_id
                )
            elif action == 'stop':
                self.scheduler.add_job(
                    self._execute_stop_action,
                    DateTrigger(run_date=run_date),
                    args=[bot_key],
                    id=job_id
                )
            
            logger.info(f"일회성 작업 스케줄링: {job_id}")
            
        except Exception as e:
            logger.error(f"일회성 작업 스케줄링 실패: {e}")

    async def _execute_start_action(self, bot_key: str):
        """시작 액션 실행"""
        user_id, strategy_id = bot_key.split('_', 1)
        await self.start_bot(user_id, strategy_id)

    async def _execute_stop_action(self, bot_key: str):
        """중지 액션 실행"""
        user_id, strategy_id = bot_key.split('_', 1)
        await self.stop_bot(user_id, strategy_id)

# 전역 스케줄러 인스턴스
trading_scheduler = TradingScheduler() 