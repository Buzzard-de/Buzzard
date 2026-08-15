try:
    from fastapi import APIRouter, Query
except ImportError:
    APIRouter = None
    Query = None

from buzzard_ai_complete.master_taxonomy_48_maximal.service import MasterTaxonomy48Service

if APIRouter:
    router = APIRouter(prefix="/master-taxonomy-48", tags=["master-taxonomy-48"])
    service = MasterTaxonomy48Service()

    @router.get("/health")
    def master_taxonomy_48_health():
        return service.health()

    @router.get("/counts")
    def master_taxonomy_48_counts():
        return service.load_counts()

    @router.get("/taxonomy")
    def master_taxonomy_48_taxonomy():
        return service.load_taxonomy()

    @router.get("/main-categories")
    def master_taxonomy_48_main_categories():
        categories = service.list_main_categories()
        return {"categories": categories, "count": len(categories)}

    @router.get("/search")
    def master_taxonomy_48_search(q: str = Query(..., min_length=1)):
        hits = service.taxonomy().search(q)
        return {"query": q, "hits": hits, "count": len(hits)}

    @router.get("/children/{parent_id}")
    def master_taxonomy_48_children(parent_id: str):
        children = service.taxonomy().children(parent_id)
        return {"parent_id": parent_id, "children": children, "count": len(children)}

    @router.get("/demo")
    def master_taxonomy_48_demo():
        return service.demo_flow()
else:
    router = None
