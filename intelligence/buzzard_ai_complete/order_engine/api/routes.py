try:
    from fastapi import APIRouter
    from pydantic import BaseModel, Field
except ImportError:
    APIRouter = None

from buzzard_ai_complete.order_engine.service import OrderFulfillmentService

if APIRouter:
    router = APIRouter(prefix="/orders", tags=["orders"])
    service = OrderFulfillmentService()

    class ProcessOrderRequest(BaseModel):
        order_id: str
        customer_id: str
        country: str = "DE"
        postal_code: str = ""
        sku: str
        quantity: int = Field(gt=0)
        unit_price: float = Field(ge=0)

    @router.post("/process")
    def process_order(req: ProcessOrderRequest):
        result = service.process_order(
            req.order_id,
            req.customer_id,
            req.country,
            req.postal_code,
            req.sku,
            req.quantity,
            req.unit_price,
        )
        return _result_payload(result)
else:
    router = None


def _result_payload(result):
    return {
        "order_id": result.order_id,
        "status": result.status,
        "supplier": result.supplier,
        "carrier": result.carrier,
        "tracking_number": result.tracking_number,
        "errors": result.errors,
    }
