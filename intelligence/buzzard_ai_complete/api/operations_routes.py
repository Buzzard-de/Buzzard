try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

if APIRouter:
    router = APIRouter(prefix="/operations", tags=["operations"])

    @router.get("/de-ecom-intel-scan")
    @router.post("/de-ecom-intel-scan")
    def de_ecom_intel_scan():
        from buzzard_ai_complete.operations.de_ecom_intel_scan import run_de_ecom_intel_scan

        return run_de_ecom_intel_scan()
else:
    router = None
