try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

from buzzard_ai_complete.renewable_energy_maximal.service import RenewableEnergyService

if APIRouter:
    router = APIRouter(prefix="/renewable-energy", tags=["renewable-energy"])
    service = RenewableEnergyService()

    @router.get("/health")
    def renewable_energy_health():
        return service.health()

    @router.get("/branches")
    def renewable_energy_branches():
        branches = service.list_branches()
        return {"branches": branches, "count": len(branches)}

    @router.get("/schema")
    def renewable_energy_schema():
        return {
            "taxonomy": service.load_schema(),
            "config": service.load_config(),
        }

    @router.get("/taxonomy")
    def renewable_energy_taxonomy():
        return service.load_taxonomy()

    @router.get("/demo")
    def renewable_energy_demo():
        return service.demo_flow()
else:
    router = None
