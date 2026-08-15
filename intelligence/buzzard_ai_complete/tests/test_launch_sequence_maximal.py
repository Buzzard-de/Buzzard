import json
from pathlib import Path

from buzzard_ai_complete.launch_sequence_maximal.launch.orchestrator import STAGES
from buzzard_ai_complete.launch_sequence_maximal.marketplace.activation import validate_channel
from buzzard_ai_complete.launch_sequence_maximal.payment.activation import validate_payment_config
from buzzard_ai_complete.launch_sequence_maximal.pim.import_pipeline import PIMImportPipeline
from buzzard_ai_complete.launch_sequence_maximal.production.preflight import validate_environment
from buzzard_ai_complete.launch_sequence_maximal.service import LaunchSequenceService
from buzzard_ai_complete.launch_sequence_maximal.shipping.activation import validate_shipping_config
from buzzard_ai_complete.launch_sequence_maximal.telephony.activation import validate_phone

MODULE_ROOT = Path(__file__).resolve().parents[1] / "launch_sequence_maximal"


class Repo:
    def __init__(self):
        self.items = {}

    def upsert(self, item):
        self.items[item["sku"]] = item


def test_stage_order():
    assert STAGES == [
        "domain_production_server",
        "pim_real_product_data",
        "supplier",
        "payment",
        "shipping",
        "marketplace",
        "telephony",
        "security_e2e",
        "launch",
    ]


def test_pim():
    pipeline = PIMImportPipeline(Repo())
    result = pipeline.import_items(
        [{"sku": "X", "title": "X", "price": "10", "currency": "EUR", "stock": 2}],
        "test",
    )
    assert result["imported"] == 1


def test_activation_gates():
    assert validate_payment_config({"provider": "x", "merchant_account": "m", "webhook_secret": "s"})["passed"]
    assert validate_shipping_config({"carrier": "x", "account_id": "a", "api_credential": "c"})["passed"]
    assert validate_channel({"channel": "eBay", "seller_account": "s", "api_credentials": "c"})["passed"]
    assert validate_phone(
        {
            "provider": "x",
            "phone_number": "+1",
            "credentials": "c",
            "public_webhook": "https://x",
            "media_stream": "wss://x",
        }
    )["passed"]


def test_preflight():
    assert validate_environment(
        {
            "APP_BASE_URL": "https://buzzard.example",
            "APP_DOMAIN": "buzzard.example",
            "POSTGRES_DB": "b",
            "POSTGRES_USER": "u",
            "POSTGRES_PASSWORD": "p",
        }
    )["passed"]


def test_launch_config():
    data = json.loads((MODULE_ROOT / "config" / "launch_state.json").read_text())
    assert data["launch"]["status"] == "blocked_until_all_previous_pass"


def test_launch_demo():
    demo = LaunchSequenceService().demo_flow()
    assert demo["health"]["status"] == "launch_sequence_ready"
    assert demo["pim_import"]["imported"] >= 1
    assert demo["e2e_dry_run"]["passed"] is True
