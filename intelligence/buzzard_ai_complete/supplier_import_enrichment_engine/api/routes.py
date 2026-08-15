try:
    from fastapi import APIRouter
    from pydantic import BaseModel, Field
except ImportError:
    APIRouter = None

from buzzard_ai_complete.supplier_import_enrichment_engine.service import (
    SupplierImportEnrichmentService,
)

if APIRouter:
    router = APIRouter(prefix="/import-engine", tags=["import-engine"])
    service = SupplierImportEnrichmentService()

    class RunRequest(BaseModel):
        supplier_id: str
        records: list[dict] = Field(default_factory=list)
        dry_run: bool = True

    @router.get("/health")
    def import_engine_health():
        return service.health()

    @router.get("/schema/decision")
    def import_engine_decision_schema():
        return service.decision_schema()

    @router.get("/schema/normalized-record")
    def import_engine_normalized_schema():
        return service.normalized_record_schema()

    @router.post("/preview")
    def import_engine_preview(req: RunRequest):
        return service.preview(req.supplier_id, req.records, dry_run=req.dry_run)

    @router.get("/demo")
    def import_engine_demo():
        return service.demo_flow()
else:
    router = None
