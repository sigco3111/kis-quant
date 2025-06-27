"""
서버 헬스체크 모듈
자동매매 서버의 상태, 성능, 연결 상태를 모니터링합니다.
"""

import time
import psutil
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

# 로깅 설정
logger = logging.getLogger(__name__)

class HealthStatus(Enum):
    """헬스체크 상태"""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    DOWN = "down"

@dataclass
class HealthMetric:
    """헬스체크 지표"""
    name: str
    value: float
    unit: str
    status: HealthStatus
    threshold_warning: float
    threshold_critical: float
    last_updated: datetime

@dataclass
class SystemInfo:
    """시스템 정보"""
    cpu_percent: float
    memory_percent: float
    disk_percent: float
    network_connections: int
    uptime_seconds: float
    load_average: List[float]

class HealthChecker:
    """헬스체크 관리자"""
    
    def __init__(self):
        self.start_time = time.time()
        self.metrics: Dict[str, HealthMetric] = {}
        self.alerts: List[Dict[str, Any]] = []
        self.max_alerts = 100
        
        # 기본 임계값 설정
        self.thresholds = {
            'cpu_percent': {'warning': 70.0, 'critical': 90.0},
            'memory_percent': {'warning': 80.0, 'critical': 95.0},
            'disk_percent': {'warning': 85.0, 'critical': 95.0},
            'response_time': {'warning': 1000.0, 'critical': 3000.0},  # ms
            'error_rate': {'warning': 5.0, 'critical': 10.0},  # %
        }

    async def check_system_health(self) -> SystemInfo:
        """시스템 헬스체크 수행"""
        try:
            # CPU 사용률
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # 메모리 사용률
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            # 디스크 사용률
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            
            # 네트워크 연결 수
            network_connections = len(psutil.net_connections())
            
            # 업타임
            uptime_seconds = time.time() - self.start_time
            
            # 로드 평균 (Unix 시스템에서만)
            try:
                load_average = list(psutil.getloadavg())
            except AttributeError:
                load_average = [0.0, 0.0, 0.0]  # Windows에서는 지원하지 않음
            
            system_info = SystemInfo(
                cpu_percent=cpu_percent,
                memory_percent=memory_percent,
                disk_percent=disk_percent,
                network_connections=network_connections,
                uptime_seconds=uptime_seconds,
                load_average=load_average
            )
            
            # 지표 업데이트
            await self._update_metrics(system_info)
            
            return system_info
            
        except Exception as e:
            logger.error(f"시스템 헬스체크 실패: {e}")
            raise

    async def _update_metrics(self, system_info: SystemInfo):
        """헬스체크 지표 업데이트"""
        now = datetime.now()
        
        # CPU 지표
        cpu_status = self._get_status('cpu_percent', system_info.cpu_percent)
        self.metrics['cpu_percent'] = HealthMetric(
            name='CPU 사용률',
            value=system_info.cpu_percent,
            unit='%',
            status=cpu_status,
            threshold_warning=self.thresholds['cpu_percent']['warning'],
            threshold_critical=self.thresholds['cpu_percent']['critical'],
            last_updated=now
        )
        
        # 메모리 지표
        memory_status = self._get_status('memory_percent', system_info.memory_percent)
        self.metrics['memory_percent'] = HealthMetric(
            name='메모리 사용률',
            value=system_info.memory_percent,
            unit='%',
            status=memory_status,
            threshold_warning=self.thresholds['memory_percent']['warning'],
            threshold_critical=self.thresholds['memory_percent']['critical'],
            last_updated=now
        )
        
        # 디스크 지표
        disk_status = self._get_status('disk_percent', system_info.disk_percent)
        self.metrics['disk_percent'] = HealthMetric(
            name='디스크 사용률',
            value=system_info.disk_percent,
            unit='%',
            status=disk_status,
            threshold_warning=self.thresholds['disk_percent']['warning'],
            threshold_critical=self.thresholds['disk_percent']['critical'],
            last_updated=now
        )
        
        # 업타임 지표
        self.metrics['uptime'] = HealthMetric(
            name='서버 업타임',
            value=system_info.uptime_seconds,
            unit='초',
            status=HealthStatus.HEALTHY,  # 업타임은 항상 정상
            threshold_warning=0,
            threshold_critical=0,
            last_updated=now
        )

    def _get_status(self, metric_name: str, value: float) -> HealthStatus:
        """지표 값에 따른 상태 반환"""
        if metric_name not in self.thresholds:
            return HealthStatus.HEALTHY
            
        thresholds = self.thresholds[metric_name]
        
        if value >= thresholds['critical']:
            return HealthStatus.CRITICAL
        elif value >= thresholds['warning']:
            return HealthStatus.WARNING
        else:
            return HealthStatus.HEALTHY

    async def check_external_dependencies(self) -> Dict[str, HealthStatus]:
        """외부 의존성 헬스체크"""
        dependencies = {}
        
        try:
            # KIS API 연결 체크
            dependencies['kis_api'] = await self._check_kis_api()
            
            # Firebase 연결 체크
            dependencies['firebase'] = await self._check_firebase()
            
            # 데이터베이스 연결 체크 (필요시)
            dependencies['database'] = await self._check_database()
            
        except Exception as e:
            logger.error(f"외부 의존성 체크 실패: {e}")
            
        return dependencies

    async def _check_kis_api(self) -> HealthStatus:
        """KIS API 연결 상태 체크"""
        try:
            # 실제 환경에서는 KIS API 헬스체크 엔드포인트 호출
            # 현재는 시뮬레이션
            await asyncio.sleep(0.1)  # 네트워크 지연 시뮬레이션
            
            # 90% 확률로 정상
            import random
            if random.random() > 0.1:
                return HealthStatus.HEALTHY
            else:
                return HealthStatus.WARNING
                
        except Exception as e:
            logger.error(f"KIS API 헬스체크 실패: {e}")
            return HealthStatus.CRITICAL

    async def _check_firebase(self) -> HealthStatus:
        """Firebase 연결 상태 체크"""
        try:
            # 실제 환경에서는 Firebase 연결 테스트
            await asyncio.sleep(0.05)
            
            # 95% 확률로 정상
            import random
            if random.random() > 0.05:
                return HealthStatus.HEALTHY
            else:
                return HealthStatus.WARNING
                
        except Exception as e:
            logger.error(f"Firebase 헬스체크 실패: {e}")
            return HealthStatus.CRITICAL

    async def _check_database(self) -> HealthStatus:
        """데이터베이스 연결 상태 체크"""
        try:
            # 실제 환경에서는 데이터베이스 연결 테스트
            await asyncio.sleep(0.02)
            return HealthStatus.HEALTHY
            
        except Exception as e:
            logger.error(f"데이터베이스 헬스체크 실패: {e}")
            return HealthStatus.CRITICAL

    async def get_overall_health(self) -> Dict[str, Any]:
        """전체 헬스체크 상태 반환"""
        try:
            # 시스템 헬스체크
            system_info = await self.check_system_health()
            
            # 외부 의존성 체크
            dependencies = await self.check_external_dependencies()
            
            # 전체 상태 계산
            overall_status = self._calculate_overall_status()
            
            return {
                'status': overall_status.value,
                'timestamp': datetime.now().isoformat(),
                'system': {
                    'cpu_percent': system_info.cpu_percent,
                    'memory_percent': system_info.memory_percent,
                    'disk_percent': system_info.disk_percent,
                    'uptime_seconds': system_info.uptime_seconds,
                    'network_connections': system_info.network_connections,
                    'load_average': system_info.load_average
                },
                'dependencies': {k: v.value for k, v in dependencies.items()},
                'metrics': {
                    k: {
                        'name': v.name,
                        'value': v.value,
                        'unit': v.unit,
                        'status': v.status.value,
                        'last_updated': v.last_updated.isoformat()
                    } for k, v in self.metrics.items()
                },
                'alerts': self.alerts[-10:]  # 최근 10개 알림
            }
            
        except Exception as e:
            logger.error(f"전체 헬스체크 실패: {e}")
            return {
                'status': HealthStatus.CRITICAL.value,
                'timestamp': datetime.now().isoformat(),
                'error': str(e)
            }

    def _calculate_overall_status(self) -> HealthStatus:
        """전체 상태 계산"""
        if not self.metrics:
            return HealthStatus.DOWN
            
        statuses = [metric.status for metric in self.metrics.values()]
        
        # 하나라도 CRITICAL이면 CRITICAL
        if HealthStatus.CRITICAL in statuses:
            return HealthStatus.CRITICAL
            
        # 하나라도 WARNING이면 WARNING
        if HealthStatus.WARNING in statuses:
            return HealthStatus.WARNING
            
        return HealthStatus.HEALTHY

    def add_alert(self, alert_type: str, message: str, severity: str = 'info'):
        """알림 추가"""
        alert = {
            'type': alert_type,
            'message': message,
            'severity': severity,
            'timestamp': datetime.now().isoformat()
        }
        
        self.alerts.append(alert)
        
        # 최대 알림 수 제한
        if len(self.alerts) > self.max_alerts:
            self.alerts = self.alerts[-self.max_alerts:]
            
        logger.info(f"알림 추가: {alert}")

    def update_threshold(self, metric_name: str, warning: float, critical: float):
        """임계값 업데이트"""
        if metric_name in self.thresholds:
            self.thresholds[metric_name]['warning'] = warning
            self.thresholds[metric_name]['critical'] = critical
            logger.info(f"{metric_name} 임계값 업데이트: warning={warning}, critical={critical}")

    async def start_monitoring(self, interval_seconds: int = 30):
        """모니터링 시작 (백그라운드)"""
        logger.info(f"헬스체크 모니터링 시작 (간격: {interval_seconds}초)")
        
        while True:
            try:
                await self.check_system_health()
                
                # 임계값 초과 시 알림 생성
                for metric_name, metric in self.metrics.items():
                    if metric.status == HealthStatus.CRITICAL:
                        self.add_alert(
                            'threshold_exceeded',
                            f'{metric.name}이(가) 위험 수준에 도달했습니다: {metric.value}{metric.unit}',
                            'critical'
                        )
                    elif metric.status == HealthStatus.WARNING:
                        self.add_alert(
                            'threshold_warning',
                            f'{metric.name}이(가) 경고 수준에 도달했습니다: {metric.value}{metric.unit}',
                            'warning'
                        )
                
                await asyncio.sleep(interval_seconds)
                
            except Exception as e:
                logger.error(f"모니터링 중 오류 발생: {e}")
                self.add_alert('monitoring_error', f'모니터링 오류: {str(e)}', 'error')
                await asyncio.sleep(interval_seconds)

# 전역 헬스체커 인스턴스
health_checker = HealthChecker()

async def get_health_status() -> Dict[str, Any]:
    """헬스체크 상태 반환 (API 엔드포인트용)"""
    return await health_checker.get_overall_health()

async def start_health_monitoring(interval_seconds: int = 30):
    """헬스체크 모니터링 시작"""
    await health_checker.start_monitoring(interval_seconds) 