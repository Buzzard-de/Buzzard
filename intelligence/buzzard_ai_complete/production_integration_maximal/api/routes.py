try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

from buzzard_ai_complete.production_integration_maximal.service import ProductionIntegrationService

if APIRouter:
    router = APIRouter(prefix="/production", tags=["production"])
    service = ProductionIntegrationService()

    @router.get("/health")
    def production_health():
        return service.health()

    @router.get("/readiness")
    def production_readiness():
        return service.readiness()

    @router.get("/config")
    def production_config():
        return {
            "integrations": service.load_production_config(),
            "providers": service.provider_registry(),
            "advanced_engines": service.advanced_engines_config(),
        }

    @router.get("/schema/advanced-systems")
    def production_advanced_schema():
        return service.advanced_systems_schema()

    @router.get("/demo")
    def production_demo():
        return service.demo_flow()
else:
    router = None
