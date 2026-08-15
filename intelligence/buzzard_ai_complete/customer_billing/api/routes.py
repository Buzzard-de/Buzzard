try:
    from fastapi import APIRouter
    from pydantic import BaseModel, Field
except ImportError:
    APIRouter = None

from buzzard_ai_complete.customer_billing.service import CustomerBillingService

if APIRouter:
    router = APIRouter(prefix="/billing", tags=["billing"])
    service = CustomerBillingService()

    class RefundRequest(BaseModel):
        order_id: str
        reason: str
        amount: float = Field(gt=0)

    class PaymentStatusRequest(BaseModel):
        order_id: str
        gross_total: float = Field(ge=0)

    @router.post("/refund")
    def request_refund(req: RefundRequest):
        return service.refund(req.order_id, req.reason, req.amount)

    @router.post("/payment-status")
    def payment_status(req: PaymentStatusRequest):
        return service.payment_status(req.order_id, req.gross_total)

    @router.get("/demo")
    def billing_demo():
        return service.demo_flow()
else:
    router = None
