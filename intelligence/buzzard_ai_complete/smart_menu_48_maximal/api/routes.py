try:
    from fastapi import APIRouter, Query
except ImportError:
    APIRouter = None
    Query = None

from buzzard_ai_complete.smart_menu_48_maximal.service import SmartMenu48Service

if APIRouter:
    router = APIRouter(prefix="/smart-menu-48", tags=["smart-menu-48"])
    service = SmartMenu48Service()

    @router.get("/health")
    def smart_menu_48_health():
        return service.health()

    @router.get("/taxonomy")
    def smart_menu_48_taxonomy():
        return service.load_taxonomy()

    @router.get("/main-categories")
    def smart_menu_48_main_categories():
        categories = service.engine().main_categories()
        return {"categories": categories, "count": len(categories)}

    @router.get("/search")
    def smart_menu_48_search(q: str = Query(..., min_length=1)):
        hits = service.engine().search(q)
        return {"query": q, "hits": hits, "count": len(hits)}

    @router.get("/signals/{sub_id}")
    def smart_menu_48_signals(sub_id: str):
        signals = service.engine().get_signals(sub_id)
        if signals is None:
            return {"error": "subcategory_not_found", "sub_id": sub_id}
        return {"sub_id": sub_id, "signals": signals}

    @router.get("/demo")
    def smart_menu_48_demo():
        return service.demo_flow()
else:
    router = None
