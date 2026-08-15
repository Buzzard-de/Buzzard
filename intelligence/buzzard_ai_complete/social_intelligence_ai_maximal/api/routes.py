try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

from buzzard_ai_complete.social_intelligence_ai_maximal.service import SocialIntelligenceService

if APIRouter:
    router = APIRouter(prefix="/social-intelligence", tags=["social-intelligence"])
    service = SocialIntelligenceService()

    @router.get("/health")
    def social_intel_health():
        return service.health()

    @router.get("/platforms")
    def social_intel_platforms():
        platforms = service.list_platforms()
        return {"platforms": platforms, "count": len(platforms)}

    @router.get("/schema")
    def social_intel_schema():
        return {
            "signal": service.load_schema(),
            "config": service.load_config(),
        }

    @router.get("/demo")
    def social_intel_demo():
        return service.demo_flow()
else:
    router = None
