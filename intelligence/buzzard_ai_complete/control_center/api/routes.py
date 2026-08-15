try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

from buzzard_ai_complete.control_center.service import OnePieceControlService

if APIRouter:
    router = APIRouter(prefix="/control-center", tags=["control-center"])
    service = OnePieceControlService()

    @router.get("/demo")
    def control_center_demo():
        return service.demo_flow()

    @router.get("/e2e/{order_id}")
    def control_center_e2e(order_id: str):
        return service.e2e_plan(order_id)
else:
    router = None
