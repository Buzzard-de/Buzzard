try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService

if APIRouter:
    router = APIRouter(prefix="/automotive-taxonomy", tags=["automotive-taxonomy"])
    service = AutomotiveTaxonomyService()

    @router.get("/health")
    def automotive_taxonomy_health():
        return service.health()

    @router.get("/seed")
    def automotive_taxonomy_seed():
        seed = service.master_seed()
        return {"systems": seed, "count": len(seed)}

    @router.get("/schema")
    def automotive_taxonomy_schema():
        return {
            "taxonomy": service.load_schema(),
            "config": service.load_config(),
        }

    @router.get("/demo")
    def automotive_taxonomy_demo():
        return service.demo_flow()
else:
    router = None
