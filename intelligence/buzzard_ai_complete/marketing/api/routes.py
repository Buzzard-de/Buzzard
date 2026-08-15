try:
    from fastapi import APIRouter
    from pydantic import BaseModel, Field
except ImportError:
    APIRouter = None

from buzzard_ai_complete.marketing.service import MarketingAdvertisingService

if APIRouter:
    router = APIRouter(prefix="/marketing", tags=["marketing"])
    service = MarketingAdvertisingService()

    class BudgetRequest(BaseModel):
        total: float = Field(gt=0)
        channels: list[str]
        weights: dict[str, float] | None = None

    class CampaignRequest(BaseModel):
        provider: str
        campaign_id: str
        name: str
        channel: str
        budget: float = Field(gt=0)
        objective: str = "SALES"

    @router.get("/demo")
    def marketing_demo():
        return service.demo_flow()

    @router.post("/budget")
    def marketing_budget(req: BudgetRequest):
        return service.allocate_budget(req.total, req.channels, req.weights)

    @router.post("/campaign")
    def marketing_campaign(req: CampaignRequest):
        return service.create_campaign(
            req.provider,
            req.campaign_id,
            req.name,
            req.channel,
            req.budget,
            req.objective,
        )
else:
    router = None
