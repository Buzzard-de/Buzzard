import json
from pathlib import Path

from buzzard_ai_complete.ai_phone_assistant.memory.crm_context import build_agent_context
from buzzard_ai_complete.ai_phone_assistant.memory.service import CustomerMemory

CONFIG_DIR = Path(__file__).resolve().parent / "config"
SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"


class PhoneMemoryCrmService:
    def __init__(self, memory=None):
        self.memory = memory or CustomerMemory()

    def load_privacy_config(self):
        return json.loads((CONFIG_DIR / "memory_privacy.json").read_text(encoding="utf-8"))

    def call_memory_schema(self):
        return json.loads((SCHEMA_DIR / "call_memory.schema.json").read_text(encoding="utf-8"))

    def health(self):
        privacy = self.load_privacy_config()
        return {
            "service": "phone-memory-crm",
            "version": "2.0.0",
            "status": "ready",
            "customers": self.memory.customer_count(),
            "call_recording_default": privacy.get("call_recording_default", False),
            "identity_gate": "verification_required_for_private_context",
        }

    def find_or_create_customer(self, phone, language="de", display_name=None):
        customer_id = self.memory.find_or_create(phone, language, display_name)
        return {"customer_id": customer_id}

    def agent_context(self, customer_id, verification_level="none"):
        return build_agent_context(self.memory, customer_id, verification_level)

    def save_approved_fact(self, customer_id, key, value, call_id=None, confidence=1.0):
        self.memory.save_fact(
            customer_id,
            key,
            value,
            call_id=call_id,
            confidence=confidence,
            approved=True,
        )
        return {"customer_id": customer_id, "key": key, "approved": True}

    def log_call(self, call_id, customer_id, language, outcome, summary):
        self.memory.log_call(call_id, customer_id, language, outcome, summary)
        return {"call_id": call_id, "logged": True}

    def demo_flow(self):
        customer = self.find_or_create_customer("+491234567890", language="de", display_name="Demo")
        customer_id = customer["customer_id"]
        self.save_approved_fact(customer_id, "preferred_language", "de")
        self.log_call(
            "demo-call-1",
            customer_id,
            "de",
            "resolved",
            "Kunde fragte nach Bremsbelägen.",
        )
        return {
            "health": self.health(),
            "customer": customer,
            "unverified_context": self.agent_context(customer_id, "none"),
            "verified_context": self.agent_context(customer_id, "phone_verified"),
            "schema": self.call_memory_schema(),
        }
