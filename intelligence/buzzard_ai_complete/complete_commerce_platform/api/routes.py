try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

from buzzard_ai_complete.complete_commerce_platform.service import CompleteCommercePlatformService

if APIRouter:
    router = APIRouter(prefix="/platform", tags=["platform"])
    service = CompleteCommercePlatformService()

    @router.get("/health")
    def platform_health():
        return service.health()

    @router.get("/modules")
    def platform_modules():
        return service.modules()

    @router.get("/schema/events")
    def platform_events_schema():
        return service.events_schema()

    @router.get("/schema/order")
    def platform_order_schema():
        return service.order_schema()

    @router.get("/policy/security")
    def platform_security_policy():
        return service.security_policy()

    @router.get("/policy/channels")
    def platform_channel_policy():
        return service.channel_mapping_policy()

    @router.get("/demo")
    def platform_demo():
        return service.demo_flow()
else:
    router = None
