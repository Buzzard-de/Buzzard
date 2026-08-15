try:
    from fastapi import APIRouter, HTTPException, Query
except ImportError:
    APIRouter = None

from buzzard_ai_complete.master_taxonomy.service import MasterTaxonomyService

if APIRouter:
    router = APIRouter(prefix="/taxonomy", tags=["taxonomy"])
    service = MasterTaxonomyService()

    @router.get("")
    def taxonomy_all():
        nodes = service.all_nodes()
        return {"count": len(nodes), "nodes": nodes}

    @router.get("/snapshot")
    def taxonomy_snapshot():
        return service.snapshot()

    @router.get("/categories")
    def taxonomy_categories(level: int = Query(1, ge=1, le=3)):
        return service.by_level(level)

    @router.get("/category/{node_id}")
    def taxonomy_category(node_id: str):
        node = service.get_node(node_id)
        if not node:
            raise HTTPException(status_code=404, detail="Category not found")
        return {
            "node": node,
            "children": service.children(node_id),
            "path": service.path(node_id),
        }

    @router.get("/search")
    def taxonomy_search(q: str = Query(..., min_length=1)):
        return service.search(q)
else:
    router = None
