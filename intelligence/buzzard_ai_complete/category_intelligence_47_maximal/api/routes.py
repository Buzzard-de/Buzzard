try:
    from fastapi import APIRouter, HTTPException
except ImportError:
    APIRouter = None

from buzzard_ai_complete.category_intelligence_47_maximal.category_intelligence_os.models import (
    BuzzNode,
    Category,
    Competitor,
    EvidenceIn,
    Feature,
    Finding,
    Node,
    ReviewIn,
)
from buzzard_ai_complete.category_intelligence_47_maximal.service import CategoryIntelligence47Service

if APIRouter:
    router = APIRouter(prefix="/category-intelligence-47", tags=["category-intelligence-47"])
    service = CategoryIntelligence47Service()

    @router.get("/health")
    def category_intel_47_health():
        return service.health()

    @router.get("/summary")
    def category_intel_47_summary():
        return service.summary()

    @router.get("/categories")
    def category_intel_47_categories():
        return service.store.list_categories()

    @router.post("/categories/import")
    def category_intel_47_import_categories(rows: list[Category]):
        return service.store.import_categories(rows)

    @router.post("/categories/seed")
    def category_intel_47_seed_categories():
        return service.seed_categories()

    @router.post("/competitors")
    def category_intel_47_add_competitor(payload: Competitor):
        try:
            return service.store.add_competitor(payload)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    @router.get("/categories/{category_id}/competitors")
    def category_intel_47_competitors(category_id: int):
        return service.store.list_competitors(category_id)

    @router.post("/nodes")
    def category_intel_47_add_node(payload: Node):
        try:
            return service.store.add_node(payload)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @router.post("/buzzard-nodes")
    def category_intel_47_add_buzzard_node(payload: BuzzNode):
        try:
            return service.store.add_buzzard_node(payload)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @router.post("/features")
    def category_intel_47_add_feature(payload: Feature):
        return service.store.add_feature(payload)

    @router.post("/findings")
    def category_intel_47_add_finding(payload: Finding):
        return service.store.add_finding(payload)

    @router.get("/analysis/{category_id}")
    def category_intel_47_analysis(category_id: int):
        try:
            return service.store.analyze(category_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    @router.get("/audit")
    def category_intel_47_audit():
        return service.store.list_audit()

    @router.get("/intelligence-os")
    def category_intel_47_intelligence_os():
        return service.intelligence_os_summary()

    @router.get("/intelligence-os/full")
    def category_intel_47_intelligence_os_full():
        return service.load_manifest()

    @router.get("/final-manifest")
    def category_intel_47_final_manifest():
        return service.load_final_manifest()

    @router.get("/final-manifest/summary")
    def category_intel_47_final_manifest_summary():
        return service.final_manifest_summary()

    @router.get("/intelligence-os-final-100-single-file")
    def category_intel_47_final_100_single_file():
        return service.final_100_single_file_summary()

    @router.get("/intelligence-os-max-final-single-file")
    def category_intel_47_max_final_single_file():
        return service.max_final_single_file_summary()

    @router.get("/intelligence-os-max-single-final-single-file")
    def category_intel_47_max_single_final_single_file():
        return service.max_single_final_single_file_summary()

    @router.get("/intelligence-os-final-max-single-file")
    def category_intel_47_final_max_single_file():
        return service.final_max_single_file_summary()

    @router.get("/research-matrix")
    def category_intel_47_research_matrix():
        try:
            return service.research_matrix()
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    @router.post("/research-matrix/import")
    def category_intel_47_research_matrix_import():
        return service.import_research_matrix()

    @router.post("/evidence")
    def category_intel_47_add_evidence(payload: EvidenceIn):
        try:
            return service.add_evidence(payload)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @router.post("/evidence/review")
    def category_intel_47_review_evidence(payload: ReviewIn):
        try:
            return service.review_evidence(payload)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    @router.get("/evidence/{competitor_id}")
    def category_intel_47_competitor_evidence(competitor_id: int):
        return service.list_competitor_evidence(competitor_id)

    @router.post("/competitor/{competitor_id}/verify")
    def category_intel_47_verify_competitor(competitor_id: int, reviewer: str = "authorized-reviewer"):
        try:
            return service.verify_competitor(competitor_id, reviewer)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except PermissionError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @router.get("/verification-dashboard")
    def category_intel_47_verification_dashboard():
        return service.verification_dashboard()

    @router.post("/score/{category_id}")
    def category_intel_47_score_category(category_id: int):
        try:
            return service.score_category(category_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    @router.get("/executive-report")
    def category_intel_47_executive_report():
        return service.executive_report()

    @router.get("/export/competitors")
    def category_intel_47_export_competitors():
        return service.export_competitors()

    @router.get("/export/taxonomy")
    def category_intel_47_export_taxonomy():
        return service.export_taxonomy()

    @router.get("/demo")
    def category_intel_47_demo():
        return service.demo_flow()
else:
    router = None
