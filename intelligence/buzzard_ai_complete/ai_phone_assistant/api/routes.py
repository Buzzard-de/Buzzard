try:
    from fastapi import APIRouter
    from pydantic import BaseModel, Field
except ImportError:
    APIRouter = None

from buzzard_ai_complete.ai_phone_assistant.service import AiPhoneAssistantService

if APIRouter:
    router = APIRouter(prefix="/phone", tags=["phone"])
    service = AiPhoneAssistantService()

    class AnalyzeRequest(BaseModel):
        text: str
        language: str | None = None

    class AnalyzeResponse(BaseModel):
        call_id: str
        language: str
        rtl: bool
        intent: str
        entities: dict = Field(default_factory=dict)

    @router.get("/health")
    def phone_health():
        return service.health()

    @router.get("/schema/tools")
    def phone_tool_schema():
        return service.tool_contract()

    @router.get("/schema/conversation")
    def phone_conversation_schema():
        return service.conversation_state()

    @router.post("/analyze", response_model=AnalyzeResponse)
    def phone_analyze(req: AnalyzeRequest):
        result = service.analyze(req.text, req.language)
        return AnalyzeResponse(
            call_id=result["call_id"],
            language=result["language"],
            rtl=result["rtl"],
            intent=result["intent"],
            entities=result["entities"],
        )

    @router.get("/demo")
    def phone_demo():
        return service.demo_flow()
else:
    router = None
