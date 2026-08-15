try:
    from fastapi import APIRouter
    from pydantic import BaseModel, Field
except ImportError:
    APIRouter = None

from buzzard_ai_complete.ai_phone_assistant.memory_facade import PhoneMemoryCrmService
from buzzard_ai_complete.ai_phone_assistant.service import AiPhoneAssistantService

from buzzard_ai_complete.ai_phone_assistant.telephony_facade import PhoneTelephonyFacade

if APIRouter:
    router = APIRouter(prefix="/phone", tags=["phone"])
    service = AiPhoneAssistantService()
    memory_service = PhoneMemoryCrmService()
    telephony_service = PhoneTelephonyFacade()

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

    class InboundCallRequest(BaseModel):
        call_id: str | None = None
        from_number: str | None = None
        to_number: str | None = None
        demo: bool = True

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

    @router.get("/telephony/health")
    def phone_telephony_health():
        return telephony_service.health()

    @router.get("/telephony/schema")
    def phone_telephony_schema():
        return telephony_service.call_schema()

    @router.post("/telephony/inbound")
    def phone_telephony_inbound(req: InboundCallRequest):
        headers = {"X-Buzzard-Demo": "1"} if req.demo else {}
        body = {
            "call_id": req.call_id or "inbound-call",
            "from": req.from_number,
            "to": req.to_number,
        }
        return telephony_service.handle_inbound(headers, body)

    @router.post("/telephony/hangup/{call_id}")
    def phone_telephony_hangup(call_id: str):
        return telephony_service.hangup(call_id)

    @router.get("/telephony/demo")
    def phone_telephony_demo():
        return telephony_service.demo_flow()
else:
    router = None
