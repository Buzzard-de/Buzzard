try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

from buzzard_ai_complete.supplier_intelligence_ai_maximal.service import SupplierIntelligenceService

if APIRouter:
    router = APIRouter(prefix="/supplier-intelligence", tags=["supplier-intelligence"])
    service = SupplierIntelligenceService()

    @router.get("/health")
    def supplier_intelligence_health():
        return service.health()

    @router.get("/schema")
    def supplier_intelligence_schema():
        return {
            "supplier": service.load_schema(),
            "config": service.load_config(),
        }

    @router.get("/policy")
    def supplier_intelligence_policy():
        return service.load_risk_policy()

    @router.get("/demo")
    def supplier_intelligence_demo():
        return service.demo_flow()
else:
    router = None
