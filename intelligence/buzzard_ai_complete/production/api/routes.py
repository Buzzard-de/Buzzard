try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

from buzzard_ai_complete.production.agents import AgentRuntime
from buzzard_ai_complete.production.bridge import ProductionBridgeService
from buzzard_ai_complete.production.service import ProductionMaxService

if APIRouter:
    router = APIRouter(prefix="/production", tags=["production"])
    service = ProductionMaxService()
    bridge = ProductionBridgeService()

    @router.get("/bridge/preflight")
    def production_bridge_preflight():
        return bridge.preflight()

    @router.post("/bridge/preflight/save")
    def production_bridge_preflight_save():
        return bridge.save_preflight_report()

    @router.get("/bridge/max-single")
    def production_bridge_max_single():
        return bridge.max_single_summary()

    @router.get("/bridge/manifest")
    def production_bridge_manifest():
        return bridge.load_manifest()

    @router.get("/bridge/gates")
    def production_bridge_gates():
        return {"gates": bridge.evaluate_gates()}

    @router.get("/bridge/summary")
    def production_bridge_summary():
        return bridge.summary()

    @router.get("/integrations")
    def production_integrations():
        return service.integration_registry().status()

    @router.get("/agents")
    def production_agents():
        return AgentRuntime().status()

    @router.get("/readiness")
    def production_readiness():
        return service.readiness()

    @router.get("/demo")
    def production_demo():
        return service.demo_flow()
else:
    router = None
