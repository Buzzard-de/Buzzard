try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

from buzzard_ai_complete.launch_sequence_maximal.service import LaunchSequenceService

if APIRouter:
    router = APIRouter(prefix="/launch", tags=["launch"])
    service = LaunchSequenceService()

    @router.get("/health")
    def launch_health():
        return service.health()

    @router.get("/stages")
    def launch_stages():
        return {"stages": service.health()["stages"], "state": service.load_launch_state()}

    @router.get("/schema/pim-import")
    def launch_pim_schema():
        return service.pim_schema()

    @router.get("/sequence")
    def launch_sequence():
        return service.run_sequence()

    @router.get("/demo")
    def launch_demo():
        return service.demo_flow()
else:
    router = None
