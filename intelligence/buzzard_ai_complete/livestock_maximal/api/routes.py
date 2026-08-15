try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

from buzzard_ai_complete.livestock_maximal.service import LivestockService

if APIRouter:
    router = APIRouter(prefix="/livestock", tags=["livestock"])
    service = LivestockService()

    @router.get("/health")
    def livestock_health():
        return service.health()

    @router.get("/branches")
    def livestock_branches():
        branches = service.list_branches()
        return {"branches": branches, "count": len(branches)}

    @router.get("/schema")
    def livestock_schema():
        return {
            "taxonomy": service.load_schema(),
            "config": service.load_config(),
        }

    @router.get("/demo")
    def livestock_demo():
        return service.demo_flow()
else:
    router = None
