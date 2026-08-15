try:
    from fastapi import APIRouter
    from pydantic import BaseModel
except ImportError:
    APIRouter = None

from buzzard_ai_complete.pim_product_master.service import PimProductMasterService

if APIRouter:
    router = APIRouter(prefix="/pim", tags=["pim"])
    service = PimProductMasterService()

    class ImportRequest(BaseModel):
        records: list[dict]

    class ProductValidateRequest(BaseModel):
        sku: str
        canonical_category_id: str
        gtin: str | None = None
        mpn: str | None = None
        brand_id: str | None = None
        title: str | None = None
        images: str | None = None

    @router.get("/health")
    def pim_health():
        return service.health()

    @router.get("/schema")
    def pim_schema():
        return service.schema()

    @router.get("/supplier-import-schema")
    def pim_supplier_schema():
        return service.supplier_import_schema()

    @router.post("/import/process")
    def pim_import_process(req: ImportRequest):
        return service.process_import(req.records)

    @router.post("/validate")
    def pim_validate(req: ProductValidateRequest):
        return service.validate(req.model_dump())

    @router.get("/demo")
    def pim_demo():
        return service.demo_flow()
else:
    router = None
