try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

from buzzard_ai_complete.intelligence_pipeline.orchestrator import IntelligencePipelineOrchestrator

if APIRouter:
    router = APIRouter(prefix="/intelligence-pipeline", tags=["intelligence-pipeline"])
    orchestrator = IntelligencePipelineOrchestrator()

    @router.get("/health")
    def intelligence_pipeline_health():
        return orchestrator.health()

    @router.get("/stages")
    def intelligence_pipeline_stages():
        return {
            "stages": orchestrator.PIPELINE_STAGES,
            "intelligence_layers": orchestrator.INTELLIGENCE_LAYERS,
        }

    @router.get("/run")
    @router.post("/run")
    def intelligence_pipeline_run(domain: str = "kfz_automotive"):
        return orchestrator.run(domain=domain)
else:
    router = None
