from buzzard_ai_complete.ai_phone_assistant.phone.intent import detect_intent
from buzzard_ai_complete.ai_phone_assistant.phone.language_router import detect_language, is_rtl
from buzzard_ai_complete.ai_phone_assistant.service import AiPhoneAssistantService


def test_arabic():
    assert detect_language("أريد البحث عن منتج") == "ar"
    assert is_rtl("ar")


def test_german_intent():
    assert detect_intent("Ist dieser Artikel auf Lager?") == "availability"


def test_human_handoff():
    assert detect_intent("Ich möchte mit einem Mitarbeiter sprechen") == "human"


def test_analyze_flow():
    result = AiPhoneAssistantService().analyze("Ist Bremsbelag auf Lager?")
    assert result["intent"] == "availability"
    assert result["language"] == "de"


def test_demo_flow():
    demo = AiPhoneAssistantService().demo_flow()
    assert demo["health"]["status"] == "ready"
    assert len(demo["samples"]) == 3
    assert demo["guardrails"]["never_invent_stock_or_price"] is True
