try:
    from fastapi import APIRouter
    from pydantic import BaseModel, Field
except ImportError:
    APIRouter = None

from buzzard_ai_complete.ai_phone_assistant.memory_facade import PhoneMemoryCrmService
from buzzard_ai_complete.ai_phone_assistant.service import AiPhoneAssistantService

if APIRouter:
    router = APIRouter(prefix="/phone", tags=["phone"])
    service = AiPhoneAssistantService()
    memory_service = PhoneMemoryCrmService()

    class AnalyzeRequest(BaseModel):
        text: str
        language: str | None = None

    class AnalyzeResponse(BaseModel):
        call_id: str
        language: str
        rtl: bool
        intent: str
        entities: dict = Field(default_factory=dict)

    class CustomerRequest(BaseModel):
        phone: str
        language: str = "de"
        display_name: str | None = None

    class SaveFactRequest(BaseModel):
        customer_id: str
        key: str
        value: str | int | float | bool | dict | list
        call_id: str | None = None
        confidence: float = 1.0

    class LogCallRequest(BaseModel):
        call_id: str
        customer_id: str
        language: str = "de"
        outcome: str
        summary: str

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

    @router.get("/memory/health")
    def phone_memory_health():
        return memory_service.health()

    @router.get("/memory/schema")
    def phone_memory_schema():
        return memory_service.call_memory_schema()

    @router.post("/memory/customer")
    def phone_memory_customer(req: CustomerRequest):
        return memory_service.find_or_create_customer(req.phone, req.language, req.display_name)

    @router.get("/memory/context/{customer_id}")
    def phone_memory_context(customer_id: str, verification_level: str = "none"):
        return memory_service.agent_context(customer_id, verification_level)

    @router.post("/memory/fact")
    def phone_memory_fact(req: SaveFactRequest):
        return memory_service.save_approved_fact(
            req.customer_id,
            req.key,
            req.value,
            call_id=req.call_id,
            confidence=req.confidence,
        )

    @router.post("/memory/call")
    def phone_memory_call(req: LogCallRequest):
        return memory_service.log_call(
            req.call_id,
            req.customer_id,
            req.language,
            req.outcome,
            req.summary,
        )

    @router.get("/memory/demo")
    def phone_memory_demo():
        return memory_service.demo_flow()
else:
    router = None
