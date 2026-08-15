try:
    from fastapi import APIRouter, HTTPException, Query
except ImportError:
    APIRouter = None

from buzzard_ai_complete.category_intelligence_43_maximal.service import CategoryIntelligence43Service

if APIRouter:
    router = APIRouter(prefix="/category-intelligence-43", tags=["category-intelligence-43"])
    service = CategoryIntelligence43Service()

    @router.get("/health")
    def category_intel_health():
        return service.health()

    @router.get("/agents")
    def category_intel_agents():
        agents = service.list_agents()
        return {"agents": agents, "count": len(agents)}

    @router.get("/schema")
    def category_intel_schema():
        return {
            "report": service.load_schema(),
            "config": service.load_config(),
        }

    @router.get("/analyze")
    def category_intel_analyze(category_id: str = Query(default="CATEGORY_01")):
        try:
            return service.analyze_category(category_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    @router.get("/demo")
    def category_intel_demo():
        return service.demo_flow()
else:
    router = None
