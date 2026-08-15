import json
from pathlib import Path

from buzzard_ai_complete.ai_phone_assistant.telephony_facade import PhoneTelephonyFacade

MODULE_ROOT = Path(__file__).resolve().parents[1] / "ai_phone_assistant"


def test_safe_defaults():
    config = json.loads((MODULE_ROOT / "config" / "phone_production.json").read_text())
    assert config["enabled"] is False
    assert config["recording"]["enabled"] is False
    assert config["security"]["require_signed_webhooks"] is True


def test_schema():
    schema = json.loads((MODULE_ROOT / "schemas" / "phone_call.schema.json").read_text())
    assert "handoff" in schema["states"] and "active" in schema["states"]


def test_go_live_gate():
    assert (Path(__file__).resolve().parents[1] / "docs" / "PHONE_GO_LIVE.md").exists()


def test_telephony_demo():
    demo = PhoneTelephonyFacade().demo_flow()
    assert demo["health"]["status"] == "telephony_integration_ready"
    assert demo["inbound"]["session"]["state"] == "active"
    assert demo["hangup"]["action"] == "hangup"
    assert demo["go_live_doc"] is True


def test_signed_webhook_rejects_unsigned():
    service = PhoneTelephonyFacade()
    try:
        service.handle_inbound({}, {"call_id": "x", "from": "+1"})
        raised = False
    except Exception:
        raised = True
    assert raised is True
