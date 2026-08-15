try:
    from fastapi import APIRouter
    from pydantic import BaseModel, Field
except ImportError:
    APIRouter = None

from buzzard_ai_complete.crm.service import CustomerExperienceService

if APIRouter:
    router = APIRouter(prefix="/crm", tags=["crm"])
    service = CustomerExperienceService()

    class SegmentRequest(BaseModel):
        lifetime_value: float = Field(ge=0)
        order_count: int = Field(ge=0)
        support_tickets: int = Field(default=0, ge=0)

    @router.get("/demo")
    def crm_demo():
        return service.demo_flow()

    @router.post("/segment")
    def crm_segment(req: SegmentRequest):
        return service.segment(req.lifetime_value, req.order_count, req.support_tickets)
else:
    router = None
