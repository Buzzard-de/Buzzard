try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

from buzzard_ai_complete.production.agents import AgentRuntime
from buzzard_ai_complete.production.service import ProductionMaxService

if APIRouter:
    router = APIRouter(prefix="/production", tags=["production"])
    service = ProductionMaxService()

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
