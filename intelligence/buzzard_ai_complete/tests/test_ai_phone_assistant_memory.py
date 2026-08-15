from buzzard_ai_complete.ai_phone_assistant.memory.crm_context import build_agent_context
from buzzard_ai_complete.ai_phone_assistant.memory.service import CustomerMemory
from buzzard_ai_complete.ai_phone_assistant.memory.store import connect
from buzzard_ai_complete.ai_phone_assistant.memory_facade import PhoneMemoryCrmService


def test_memory_save_and_read():
    memory = CustomerMemory(connect())
    customer_id = memory.find_or_create("+491234567890", "de")
    memory.save_fact(customer_id, "preferred_language", "de", approved=True)
    facts = memory.approved_facts(customer_id)
    assert any(item["key"] == "preferred_language" for item in facts)


def test_identity_gate_blocks_private_context():
    memory = CustomerMemory(connect())
    customer_id = memory.find_or_create("+49999888777", "de")
    memory.save_fact(customer_id, "open_request", "Bremsbelag Angebot", approved=True)
    blocked = build_agent_context(memory, customer_id, "none")
    allowed = build_agent_context(memory, customer_id, "phone_verified")
    assert blocked["verified"] is False
    assert blocked["memory"] == []
    assert allowed["verified"] is True
    assert any(item["key"] == "open_request" for item in allowed["memory"])


def test_memory_facade_demo():
    demo = PhoneMemoryCrmService().demo_flow()
    assert demo["health"]["status"] == "ready"
    assert demo["verified_context"]["verified"] is True
    assert demo["unverified_context"]["verified"] is False
