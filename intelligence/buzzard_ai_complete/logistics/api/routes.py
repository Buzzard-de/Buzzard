try:
    from fastapi import APIRouter
    from pydantic import BaseModel, Field
except ImportError:
    APIRouter = None

from buzzard_ai_complete.logistics.service import SmartShippingService

if APIRouter:
    router = APIRouter(prefix="/logistics", tags=["logistics"])
    service = SmartShippingService()

    class RecommendRequest(BaseModel):
        weight_kg: float = Field(gt=0)
        length_cm: float = Field(gt=0)
        width_cm: float = Field(gt=0)
        height_cm: float = Field(gt=0)
        country: str = "DE"
        postal_code: str = ""
        priority: str = "balanced"

    @router.post("/recommend")
    def recommend(req: RecommendRequest):
        decision = service.recommend(
            req.weight_kg,
            req.length_cm,
            req.width_cm,
            req.height_cm,
            req.country,
            req.postal_code,
            req.priority,
        )
        return _decision_payload(decision)
else:
    router = None


def _quote_payload(quote):
    if quote is None:
        return None
    return {
        "carrier": quote.carrier,
        "service": quote.service,
        "price": quote.price,
        "currency": quote.currency,
        "delivery_days": quote.delivery_days,
        "available": quote.available,
        "reason": quote.reason,
    }


def _decision_payload(decision):
    return {
        "selected": _quote_payload(decision.selected),
        "alternatives": [_quote_payload(q) for q in decision.alternatives],
        "reason": decision.reason,
    }
