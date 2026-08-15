try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

from buzzard_ai_complete.construction_maximal.service import ConstructionService

if APIRouter:
    router = APIRouter(prefix="/construction", tags=["construction"])
    service = ConstructionService()

    @router.get("/health")
    def construction_health():
        return service.health()

    @router.get("/branches")
    def construction_branches():
        branches = service.list_branches()
        return {"branches": branches, "count": len(branches)}

    @router.get("/schema")
    def construction_schema():
        return {
            "taxonomy": service.load_schema(),
            "config": service.load_config(),
        }

    @router.get("/taxonomy")
    def construction_taxonomy():
        return service.load_taxonomy()

    @router.get("/demo")
    def construction_demo():
        return service.demo_flow()
else:
    router = None
