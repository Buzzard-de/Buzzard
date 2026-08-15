try:
    from fastapi import APIRouter, Query
except ImportError:
    APIRouter = None

from buzzard_ai_complete.ai_council_18_unified.service import AiCouncil18Service

if APIRouter:
    router = APIRouter(prefix="/council-18", tags=["council-18"])
    service = AiCouncil18Service()

    @router.get("/health")
    def council_health():
        return service.health()

    @router.get("/agents")
    def council_agents():
        return {"agents": service.list_agents(), "count": len(service.list_agents())}

    @router.get("/schema")
    def council_schema():
        return {
            "finding": service.load_schema(),
            "config": service.load_config(),
        }

    @router.get("/case")
    def council_case(
        objective: str = Query(default="Evaluate a new product opportunity"),
        case_id: str = Query(default="case-api"),
    ):
        return service.run_case(objective=objective, case_id=case_id)

    @router.get("/demo")
    def council_demo():
        return service.demo_flow()
else:
    router = None
