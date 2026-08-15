try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

from buzzard_ai_complete.agriculture_maximal.service import AgricultureService

if APIRouter:
    router = APIRouter(prefix="/agriculture", tags=["agriculture"])
    service = AgricultureService()

    @router.get("/health")
    def agriculture_health():
        return service.health()

    @router.get("/branches")
    def agriculture_branches():
        branches = service.list_branches()
        return {"branches": branches, "count": len(branches)}

    @router.get("/schema")
    def agriculture_schema():
        return {
            "taxonomy": service.load_schema(),
            "config": service.load_config(),
        }

    @router.get("/demo")
    def agriculture_demo():
        return service.demo_flow()
else:
    router = None
