import json
from dataclasses import asdict
from pathlib import Path

from buzzard_ai_complete.ai_phone_assistant.memory.service import CustomerMemory
from buzzard_ai_complete.ai_phone_assistant.telephony.handoff.service import HumanHandoff
from buzzard_ai_complete.ai_phone_assistant.telephony.providers.generic_signed_media import (
    GenericSignedMediaProvider,
)
from buzzard_ai_complete.ai_phone_assistant.telephony.routing.call_router import CallRouter
from buzzard_ai_complete.ai_phone_assistant.telephony.service import PhoneTelephonyRuntime
from buzzard_ai_complete.ai_phone_assistant.telephony.webhooks.service import WebhookService

CONFIG_DIR = Path(__file__).resolve().parent / "config"
SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"
DOCS_DIR = Path(__file__).resolve().parent.parent / "docs"


def signed_webhook_validator(headers, body):
    if str(headers.get("X-Buzzard-Demo", "")).lower() in {"1", "true", "yes"}:
        return True
    signature = headers.get("X-Signature") or headers.get("x-signature")
    return bool(signature)


class StubPhoneAgent:
    async def respond(self, user_event, context, session):
        return {
            "text": "Buzzard phone assistant demo response.",
            "handoff": user_event.get("intent") == "human",
            "reason": "customer_requested_human" if user_event.get("intent") == "human" else None,
            "context_verified": context.get("verified", False),
            "call_id": session.call_id,
        }


class PhoneTelephonyFacade:
    def __init__(self):
        self.config = self.load_production_config()
        self.sessions = {}
        self.provider = GenericSignedMediaProvider(signed_webhook_validator, self.config)
        self.memory = CustomerMemory()
        self.handoff = HumanHandoff(
            self.provider,
            {"default": self.config.get("human_handoff_destination")},
        )
        self.router = CallRouter(self.provider, self.memory, StubPhoneAgent(), self.handoff)
        self.runtime = PhoneTelephonyRuntime(self.provider, self.router, self.sessions)
        self.webhooks = WebhookService(self.provider, self.sessions)

    def load_production_config(self):
        return json.loads((CONFIG_DIR / "phone_production.json").read_text(encoding="utf-8"))

    def call_schema(self):
        return json.loads((SCHEMA_DIR / "phone_call.schema.json").read_text(encoding="utf-8"))

    def health(self):
        return {
            "service": "phone-telephony",
            "version": "3.0.0",
            "status": "telephony_integration_ready",
            "enabled": self.config.get("enabled", False),
            "provider": self.provider.name,
            "live_credentials_present": False,
            "require_signed_webhooks": self.config.get("security", {}).get(
                "require_signed_webhooks", True
            ),
            "recording_enabled": self.config.get("recording", {}).get("enabled", False),
            "active_sessions": len(self.sessions),
        }

    def handle_inbound(self, headers, body):
        inbound = self.webhooks.inbound(headers, body)
        session = self.runtime.create_session(inbound)
        customer_id = self.memory.find_or_create(inbound.get("from_number") or "+unknown")
        session.customer_id = customer_id
        answer = self.runtime.answer(session)
        session.state = "active"
        return {"session": asdict(session), "answer": answer}

    def hangup(self, call_id):
        session = self.sessions.get(call_id)
        if not session:
            raise ValueError("CALL_NOT_FOUND")
        return self.runtime.hangup(session)

    def demo_flow(self):
        inbound = self.handle_inbound(
            {"X-Buzzard-Demo": "1"},
            {"call_id": "demo-call-v3", "from": "+491701234567", "to": "+49800123456"},
        )
        session = self.sessions[inbound["session"]["call_id"]]
        context = self.router.build_context(session)
        media_contract = self.provider.start_media_stream(
            session,
            self.config.get("media_stream_url") or "https://example.invalid/media",
        )
        hangup = self.hangup(inbound["session"]["call_id"])
        return {
            "health": self.health(),
            "inbound": inbound,
            "context_unverified": context,
            "media_contract": media_contract,
            "hangup": hangup,
            "go_live_doc": (DOCS_DIR / "PHONE_GO_LIVE.md").exists(),
        }
