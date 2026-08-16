try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

if APIRouter:
    router = APIRouter(prefix="/connectors", tags=["connectors"])

    @router.get("/health")
    def connectors_health():
        from live_connectors.registry import connector_health

        return connector_health()

    @router.get("/status")
    def connectors_status():
        from live_connectors.registry import connector_health

        return connector_health()
else:
    router = None
