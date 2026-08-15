try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

from buzzard_ai_complete.analytics_bi.service import AnalyticsBIService

if APIRouter:
    router = APIRouter(prefix="/analytics", tags=["analytics"])
    service = AnalyticsBIService()

    @router.get("/demo")
    def analytics_demo():
        return service.demo_flow()

    @router.get("/dashboard")
    def analytics_dashboard():
        return service.dashboard()
else:
    router = None
