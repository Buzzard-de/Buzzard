import json
import uuid
from pathlib import Path

from buzzard_ai_complete.ai_phone_assistant.phone.intent import detect_intent, extract_entities
from buzzard_ai_complete.ai_phone_assistant.phone.language_router import detect_language, is_rtl
from buzzard_ai_complete.ai_phone_assistant.phone.session import CallSession
from buzzard_ai_complete.ai_phone_assistant.phone.tool_gateway import ToolGateway

CONFIG_DIR = Path(__file__).resolve().parent / "config"
SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"


class AiPhoneAssistantService:
    def load_config(self):
        return json.loads((CONFIG_DIR / "phone_assistant.json").read_text(encoding="utf-8"))

    def health(self):
        config = self.load_config()
        return {
            "service": "buzzard-ai-phone-assistant",
            "status": "ready",
            "assistant_name": config.get("assistant_name"),
            "telephony": "adapter-required",
            "realtime_voice": "adapter-required",
            "live_calling": "not_enabled_until_provider_configured",
            "recording_default": config.get("recording", {}).get("default", "disabled"),
            "human_handoff_enabled": config.get("human_handoff", {}).get("enabled", True),
        }

    def tool_contract(self):
        return json.loads((SCHEMA_DIR / "tool_contract.json").read_text(encoding="utf-8"))

    def conversation_state(self):
        return json.loads((SCHEMA_DIR / "conversation_state.json").read_text(encoding="utf-8"))

    def analyze(self, text, language=None):
        lang = language or detect_language(text)
        session = CallSession(str(uuid.uuid4()), lang)
        session.state = "intent"
        entities = extract_entities(text)
        session.entities = entities
        return {
            "call_id": session.call_id,
            "language": lang,
            "rtl": is_rtl(lang),
            "intent": detect_intent(text),
            "entities": entities,
            "session": session.snapshot(),
        }

    def demo_flow(self):
        samples = [
            "Haben Sie diesen Artikel auf Lager?",
            "Ich möchte mit einem Mitarbeiter sprechen",
            "أريد البحث عن منتج",
        ]
        gateway = ToolGateway()
        return {
            "health": self.health(),
            "samples": [self.analyze(text) for text in samples],
            "tool_gateway": {
                "product_search": gateway.search_products(query="Bremsbelag"),
                "inventory_price": gateway.lookup_inventory_price(product_id="demo"),
            },
            "guardrails": self.conversation_state().get("guardrails", {}),
        }
