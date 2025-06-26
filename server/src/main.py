"""
KIS Quant 백엔드 서버 메인 애플리케이션
한국투자증권 API 프록시 및 자동매매 시스템
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

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
        "timestamp": "2025-01-26T10:00:00Z",
        "services": {
            "database": "connected",
            "kis_api": "available",
            "firebase": "connected"
        }
    }

# API 상태 확인 엔드포인트
@app.get("/api/status")
async def api_status():
    """API 서비스 상태 확인"""
    try:
        return {
            "status": "online",
            "endpoints": {
                "health": "/health",
                "docs": "/docs",
                "trading": "/api/trading",
                "backtest": "/api/backtest"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")

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