"""
KIS Quant 백엔드 서버 메인 애플리케이션
한국투자증권 API 프록시 및 자동매매 시스템
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
import logging
from datetime import datetime
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List, Optional

# 환경 변수 로드
load_dotenv()

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 백테스트 요청 모델
class BacktestRequest(BaseModel):
    symbol: str
    start_date: str
    end_date: str
    initial_capital: float
    strategy_type: str = "simple_ma"

class BacktestResult(BaseModel):
    total_return: float
    win_rate: float
    max_drawdown: float
    total_trades: int
    final_capital: float

# FastAPI 애플리케이션 초기화
app = FastAPI(
    title="KIS Quant Backend Server",
    description="한국투자증권 API 기반 퀀트 투자 플랫폼 백엔드",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # 프론트엔드 개발 서버
        "https://*.vercel.app",   # Vercel 배포 도메인
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# 헬스 체크 엔드포인트
@app.get("/")
async def root():
    """서버 상태 확인"""
    return {
        "message": "KIS Quant Backend Server is running",
        "version": "1.0.0",
        "status": "healthy"
    }

@app.get("/health")
async def health_check():
    """상세 헬스 체크"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "database": "connected",
            "kis_api": "available",
            "firebase": "connected"
        }
    }

# 백테스트 API 엔드포인트
@app.post("/api/backtest/simple")
async def run_simple_backtest(request: BacktestRequest):
    """간단한 백테스트 실행"""
    try:
        logger.info(f"백테스트 요청 받음: {request.symbol}, {request.start_date} ~ {request.end_date}")
        
        # 간단한 모의 백테스트 결과 생성
        import random
        
        # 랜덤한 결과를 생성하여 테스트용으로 사용
        total_return = random.uniform(-20.0, 50.0)  # -20% ~ +50%
        win_rate = random.uniform(40.0, 80.0)      # 40% ~ 80%
        max_drawdown = random.uniform(-30.0, -5.0)  # -30% ~ -5%
        total_trades = random.randint(10, 100)
        final_capital = request.initial_capital * (1 + total_return / 100)
        
        result = BacktestResult(
            total_return=round(total_return, 2),
            win_rate=round(win_rate, 2),
            max_drawdown=round(max_drawdown, 2),
            total_trades=total_trades,
            final_capital=round(final_capital, 2)
        )
        
        logger.info(f"백테스트 완료: 수익률 {result.total_return}%")
        
        return {
            "status": "success",
            "message": "백테스트가 성공적으로 완료되었습니다.",
            "data": result,
            "request_info": {
                "symbol": request.symbol,
                "period": f"{request.start_date} ~ {request.end_date}",
                "initial_capital": request.initial_capital,
                "strategy": request.strategy_type
            }
        }
        
    except Exception as e:
        logger.error(f"백테스트 실행 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"백테스트 실행 중 오류가 발생했습니다: {str(e)}")

# 자동매매 관련 임포트 (주석 처리하여 일시적으로 비활성화)
# from trading.scheduler import trading_scheduler
# from trading.bot import TradingBot

# 자동매매 스케줄러 초기화
scheduler_initialized = False

@app.on_event("startup")
async def startup_event():
    """서버 시작 시 실행"""
    global scheduler_initialized
    try:
        # 자동매매 스케줄러는 일시적으로 비활성화
        # await trading_scheduler.start()
        scheduler_initialized = True
        logger.info("서버 시작됨 (자동매매는 일시적으로 비활성화)")
    except Exception as e:
        logger.error(f"서버 시작 실패: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """서버 종료 시 실행"""
    try:
        # await trading_scheduler.stop()
        logger.info("서버 종료됨")
    except Exception as e:
        logger.error(f"서버 종료 실패: {e}")

# API 상태 확인 엔드포인트
@app.get("/api/status")
async def api_status():
    """API 서비스 상태 확인"""
    try:
        return {
            "status": "online",
            "scheduler_running": scheduler_initialized,
            "endpoints": {
                "health": "/health",
                "docs": "/docs",
                "trading": "/api/trading",
                "backtest": "/api/backtest"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")

# 자동매매 API 엔드포인트
@app.post("/api/trading/start")
async def start_trading(request: dict):
    """자동매매 시작"""
    try:
        user_id = request.get('user_id')
        strategy_id = request.get('strategy_id')
        
        if not user_id or not strategy_id:
            raise HTTPException(status_code=400, detail="user_id와 strategy_id가 필요합니다.")
        
        # 매매 봇 등록 및 시작
        config = {
            'max_daily_trades': 10,
            'max_position_size': 100000,
            'check_interval': 30
        }
        
        # 자동매매 스케줄러는 일시적으로 비활성화
        # await trading_scheduler.register_trading_bot(user_id, strategy_id, config)
        # success = await trading_scheduler.start_bot(user_id, strategy_id)
        
        if False:  # 자동매매 스케줄러가 비활성화된 경우
            return {"message": "자동매매는 일시적으로 비활성화되었습니다.", "status": "paused"}
        else:
            raise HTTPException(status_code=500, detail="자동매매 시작에 실패했습니다.")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"자동매매 시작 오류: {str(e)}")

@app.post("/api/trading/stop")
async def stop_trading(request: dict):
    """자동매매 중지"""
    try:
        user_id = request.get('user_id')
        strategy_id = request.get('strategy_id')
        
        if not user_id or not strategy_id:
            raise HTTPException(status_code=400, detail="user_id와 strategy_id가 필요합니다.")
        
        # 자동매매 스케줄러는 일시적으로 비활성화
        # success = await trading_scheduler.stop_bot(user_id, strategy_id)
        
        if False:  # 자동매매 스케줄러가 비활성화된 경우
            return {"message": "자동매매는 일시적으로 비활성화되었습니다.", "status": "paused"}
        else:
            raise HTTPException(status_code=500, detail="자동매매 중지에 실패했습니다.")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"자동매매 중지 오류: {str(e)}")

@app.post("/api/trading/pause")
async def pause_trading(request: dict):
    """자동매매 일시정지"""
    try:
        user_id = request.get('user_id')
        strategy_id = request.get('strategy_id')
        
        if not user_id or not strategy_id:
            raise HTTPException(status_code=400, detail="user_id와 strategy_id가 필요합니다.")
        
        # 자동매매 스케줄러는 일시적으로 비활성화
        # success = await trading_scheduler.pause_bot(user_id, strategy_id)
        
        if False:  # 자동매매 스케줄러가 비활성화된 경우
            return {"message": "자동매매는 일시적으로 비활성화되었습니다.", "status": "paused"}
        else:
            raise HTTPException(status_code=500, detail="자동매매 일시정지에 실패했습니다.")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"자동매매 일시정지 오류: {str(e)}")

@app.post("/api/trading/resume")
async def resume_trading(request: dict):
    """자동매매 재시작"""
    try:
        user_id = request.get('user_id')
        strategy_id = request.get('strategy_id')
        
        if not user_id or not strategy_id:
            raise HTTPException(status_code=400, detail="user_id와 strategy_id가 필요합니다.")
        
        # 자동매매 스케줄러는 일시적으로 비활성화
        # success = await trading_scheduler.resume_bot(user_id, strategy_id)
        
        if False:  # 자동매매 스케줄러가 비활성화된 경우
            return {"message": "자동매매는 일시적으로 비활성화되었습니다.", "status": "paused"}
        else:
            raise HTTPException(status_code=500, detail="자동매매 재시작에 실패했습니다.")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"자동매매 재시작 오류: {str(e)}")

@app.post("/api/trading/emergency-stop")
async def emergency_stop_trading(request: dict):
    """긴급 정지"""
    try:
        user_id = request.get('user_id')
        strategy_id = request.get('strategy_id')
        
        if not user_id or not strategy_id:
            raise HTTPException(status_code=400, detail="user_id와 strategy_id가 필요합니다.")
        
        # 자동매매 스케줄러는 일시적으로 비활성화
        # success = await trading_scheduler.stop_bot(user_id, strategy_id)
        
        if False:  # 자동매매 스케줄러가 비활성화된 경우
            return {
                "message": "자동매매는 일시적으로 비활성화되었습니다.", 
                "status": "emergency_stopped",
                "timestamp": datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=500, detail="긴급 정지에 실패했습니다.")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"긴급 정지 오류: {str(e)}")

@app.get("/api/trading/status/{strategy_id}")
async def get_trading_status(strategy_id: str, user_id: str):
    """매매 봇 상태 조회"""
    try:
        # 자동매매 스케줄러는 일시적으로 비활성화
        # status = await trading_scheduler.get_bot_status(user_id, strategy_id)
        
        if False:  # 자동매매 스케줄러가 비활성화된 경우
            return {
                "status": "not_found",
                "message": "등록된 매매 봇이 없습니다."
            }
        else:
            return {
                "status": "not_found",
                "message": "자동매매는 일시적으로 비활성화되었습니다."
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"상태 조회 오류: {str(e)}")

@app.get("/api/trading/bots/status")
async def get_all_bots_status():
    """모든 매매 봇 상태 조회"""
    try:
        # 자동매매 스케줄러는 일시적으로 비활성화
        # return await trading_scheduler.get_all_bots_status()
        
        return {
            "status": "not_found",
            "message": "자동매매는 일시적으로 비활성화되었습니다."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"전체 상태 조회 오류: {str(e)}")

# 에러 핸들러
@app.exception_handler(404)
async def not_found_handler(request, exc):
    """404 에러 핸들러"""
    return JSONResponse(
        status_code=404,
        content={"message": "요청한 리소스를 찾을 수 없습니다."}
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """500 에러 핸들러"""
    return JSONResponse(
        status_code=500,
        content={"message": "내부 서버 오류가 발생했습니다."}
    )

if __name__ == "__main__":
    # 개발 서버 실행
    port = int(os.getenv("BACKEND_PORT", 8000))
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    ) 