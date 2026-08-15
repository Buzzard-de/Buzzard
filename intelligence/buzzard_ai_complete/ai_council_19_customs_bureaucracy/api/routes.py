try:
    from fastapi import APIRouter, Query
except ImportError:
    APIRouter = None

from buzzard_ai_complete.ai_council_19_customs_bureaucracy.service import AiCouncil19Service

if APIRouter:
    router = APIRouter(prefix="/council-19", tags=["council-19"])
    service = AiCouncil19Service()

    @router.get("/health")
    def council_19_health():
        return service.health()

    @router.get("/agents")
    def council_19_agents():
        agents = service.list_agents()
        return {"agents": agents, "count": len(agents)}

    @router.get("/schema")
    def council_19_schema():
        return {
            "assessment": service.load_schema(),
            "config": service.load_config(),
        }

    @router.get("/assess")
    def council_19_assess(
        product_id: str = Query(default="demo"),
        description: str = Query(default="battery charger"),
        origin: str = Query(default="DE"),
        destination: str = Query(default="TR"),
    ):
        return service.assess_trade(
            product_id=product_id,
            description=description,
            origin=origin,
            destination=destination,
        )

    @router.get("/demo")
    def council_19_demo():
        return service.demo_flow()
else:
    router = None
