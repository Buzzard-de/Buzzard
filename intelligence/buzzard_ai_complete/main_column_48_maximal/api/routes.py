try:
    from fastapi import APIRouter, Query
except ImportError:
    APIRouter = None
    Query = None

from buzzard_ai_complete.main_column_48_maximal.service import MainColumn48Service

if APIRouter:
    router = APIRouter(prefix="/main-column-48", tags=["main-column-48"])
    service = MainColumn48Service()

    @router.get("/health")
    def main_column_48_health():
        return service.health()

    @router.get("/taxonomy")
    def main_column_48_taxonomy():
        return service.load_taxonomy()

    @router.get("/main-categories")
    def main_column_48_main_categories():
        categories = service.engine().main_categories()
        return {"categories": categories, "count": len(categories)}

    @router.get("/search")
    def main_column_48_search(q: str = Query(..., min_length=1)):
        hits = service.engine().search(q)
        return {"query": q, "hits": hits, "count": len(hits)}

    @router.get("/main/{main_id}")
    def main_column_48_main(main_id: str):
        main = service.engine().get_main(main_id)
        if main is None:
            return {"error": "main_category_not_found", "main_id": main_id}
        return main

    @router.get("/demo")
    def main_column_48_demo():
        return service.demo_flow()
else:
    router = None
