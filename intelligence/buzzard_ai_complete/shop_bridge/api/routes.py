try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

from buzzard_ai_complete.shop_bridge.service import ShopBridgeService

if APIRouter:
    router = APIRouter(prefix="/shop-bridge", tags=["shop-bridge"])
    service = ShopBridgeService()

    @router.get("/readiness")
    def shop_bridge_readiness():
        return service.readiness()

    @router.get("/demo")
    def shop_bridge_demo():
        return service.demo_flow()
else:
    router = None
