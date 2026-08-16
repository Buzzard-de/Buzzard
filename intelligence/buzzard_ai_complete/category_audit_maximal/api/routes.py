try:
    from fastapi import APIRouter
except ImportError:
    APIRouter = None

from buzzard_ai_complete.category_audit_maximal.service import CategoryAuditService

if APIRouter:
    router = APIRouter(prefix="/category-audit", tags=["category-audit"])
    service = CategoryAuditService()

    @router.get("/health")
    def category_audit_health():
        return service.health()

    @router.get("/policy")
    def category_audit_policy():
        return service.load_policy()

    @router.get("/live-categories")
    def category_audit_live_categories():
        return service.load_live_categories()

    @router.get("/audit")
    def category_audit_report():
        return service.audit_report()

    @router.get("/demo")
    def category_audit_demo():
        return service.demo_flow()
else:
    router = None
