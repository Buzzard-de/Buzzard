try:
    from fastapi import APIRouter
    from pydantic import BaseModel
except ImportError:
    APIRouter = None

from buzzard_ai_complete.multilingual_product_intelligence.service import (
    MultilingualProductIntelligenceService,
)

if APIRouter:
    router = APIRouter(prefix="/multilingual", tags=["multilingual"])
    service = MultilingualProductIntelligenceService()

    class NormalizeRequest(BaseModel):
        text: str
        language: str | None = None

    @router.get("/health")
    def multilingual_health():
        return service.health()

    @router.get("/languages")
    def multilingual_languages():
        return service.languages()

    @router.post("/normalize")
    def multilingual_normalize(req: NormalizeRequest):
        return service.normalize(req.text, req.language)

    @router.get("/glossary")
    def multilingual_glossary():
        return service.glossary()

    @router.get("/ai-pipeline")
    def multilingual_ai_pipeline():
        return service.ai_pipeline()

    @router.get("/translation-schema")
    def multilingual_translation_schema():
        return service.translation_schema()

    @router.get("/demo")
    def multilingual_demo():
        return service.demo_flow()
else:
    router = None
