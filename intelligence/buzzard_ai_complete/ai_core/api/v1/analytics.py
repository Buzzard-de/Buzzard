from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.api.deps import enforce_api_permission, get_db
from buzzard_ai_complete.ai_core.observability.metrics import get_metrics_registry
from buzzard_ai_complete.ai_core.services.analytics_service import AnalyticsService
from buzzard_ai_complete.config import settings

router = APIRouter(prefix="/analytics", tags=["ai-core-analytics"])


@router.get("/kpis", dependencies=[Depends(enforce_api_permission)])
def analytics_kpis(db: Session = Depends(get_db)):
    svc = AnalyticsService(db)
    return svc.platform_kpis()


@router.get("/workers", dependencies=[Depends(enforce_api_permission)])
def analytics_workers(db: Session = Depends(get_db)):
    svc = AnalyticsService(db)
    return svc.worker_kpis()


@router.get("/metrics", dependencies=[Depends(enforce_api_permission)])
def prometheus_metrics():
    if not settings.BUZZARD_OBSERVABILITY_ENABLED:
        return {"status": "disabled"}
    body = get_metrics_registry().to_prometheus()
    return Response(content=body, media_type="text/plain; version=0.0.4")
