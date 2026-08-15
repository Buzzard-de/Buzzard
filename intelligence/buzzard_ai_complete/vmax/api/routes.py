try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

from buzzard_ai_complete.vmax.service import MaxPlatformService

if APIRouter:
    router = APIRouter(prefix="/vmax", tags=["vmax"])
    service = MaxPlatformService()

    @router.get("/demo")
    def vmax_demo():
        return service.demo_flow()

    @router.get("/snapshot")
    def vmax_snapshot():
        return service.snapshot()
else:
    router = None
