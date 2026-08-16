try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService

if APIRouter:
    router = APIRouter(prefix="/automotive-taxonomy", tags=["automotive-taxonomy"])
    service = AutomotiveTaxonomyService()

    @router.get("/health")
    def automotive_taxonomy_health():
        return service.health()

    @router.get("/seed")
    def automotive_taxonomy_seed():
        seed = service.master_seed()
        return {"systems": seed, "count": len(seed)}

    @router.get("/schema")
    def automotive_taxonomy_schema():
        return {
            "taxonomy": service.load_schema(),
            "config": service.load_config(),
        }

    @router.get("/demo")
    def automotive_taxonomy_demo():
        return service.demo_flow()

    @router.get("/tires/categories")
    def automotive_taxonomy_tires_categories():
        categories = service.tires_categories()
        return {"categories": categories, "count": len(categories)}

    @router.get("/tires/demo")
    def automotive_taxonomy_tires_demo():
        return service.tires_demo()

    @router.get("/tires/config")
    def automotive_taxonomy_tires_config():
        return service.load_tires_config()

    @router.get("/kfz-tree")
    def automotive_taxonomy_kfz_tree():
        return {
            "summary": service.kfz_summary(),
            "mains": service.kfz_mains(),
        }

    @router.get("/kfz-tree/{main_id}")
    def automotive_taxonomy_kfz_main(main_id: str):
        main = service.kfz_main(main_id)
        if not main:
            return {"error": "not_found", "main_id": main_id}
        return main

    @router.get("/kfz-shop-bridge/{main_id}")
    def automotive_taxonomy_kfz_shop_bridge(main_id: str):
        bridge = service.shop_bridge_for_kfz(main_id)
        if not bridge:
            return {"error": "not_found", "main_id": main_id}
        return bridge
else:
    router = None
