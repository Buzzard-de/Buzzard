try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

from buzzard_ai_complete.master_taxonomy_clean_maximal.service import MasterTaxonomyCleanService

if APIRouter:
    router = APIRouter(prefix="/master-taxonomy-clean", tags=["master-taxonomy-clean"])
    service = MasterTaxonomyCleanService()

    @router.get("/health")
    def master_taxonomy_clean_health():
        return service.health()

    @router.get("/manifest")
    def master_taxonomy_clean_manifest():
        return service.load_manifest()

    @router.get("/sales-defaults")
    def master_taxonomy_clean_sales_defaults():
        return service.load_sales_defaults()

    @router.get("/demo")
    def master_taxonomy_clean_demo():
        return service.demo_flow()
else:
    router = None
