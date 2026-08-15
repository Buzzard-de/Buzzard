import json
from pathlib import Path

from buzzard_ai_complete.launch_sequence_maximal.e2e.runner import E2ERunner
from buzzard_ai_complete.launch_sequence_maximal.launch.orchestrator import STAGES, LaunchOrchestrator
from buzzard_ai_complete.launch_sequence_maximal.marketplace.activation import validate_channel
from buzzard_ai_complete.launch_sequence_maximal.payment.activation import validate_payment_config
from buzzard_ai_complete.launch_sequence_maximal.pim.import_pipeline import PIMImportPipeline
from buzzard_ai_complete.launch_sequence_maximal.production.preflight import validate_environment
from buzzard_ai_complete.launch_sequence_maximal.shipping.activation import validate_shipping_config
from buzzard_ai_complete.launch_sequence_maximal.supplier.registry import SupplierRegistry
from buzzard_ai_complete.launch_sequence_maximal.telephony.activation import validate_phone

CONFIG_DIR = Path(__file__).resolve().parent / "config"
DATA_DIR = Path(__file__).resolve().parent / "data"
SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"
DOCS_DIR = Path(__file__).resolve().parent / "docs"


class MemoryProductRepo:
    def __init__(self):
        self.items = {}

    def upsert(self, item):
        self.items[item["sku"]] = item


class LaunchSequenceService:
    def load_launch_state(self):
        return json.loads((CONFIG_DIR / "launch_state.json").read_text(encoding="utf-8"))

    def load_payment_config(self):
        return json.loads((CONFIG_DIR / "payment.production.json").read_text(encoding="utf-8"))

    def load_shipping_config(self):
        return json.loads((CONFIG_DIR / "shipping.production.json").read_text(encoding="utf-8"))

    def load_marketplace_config(self):
        return json.loads((CONFIG_DIR / "marketplaces.production.json").read_text(encoding="utf-8"))

    def load_telephony_config(self):
        return json.loads((CONFIG_DIR / "telephony.production.json").read_text(encoding="utf-8"))

    def load_suppliers_config(self):
        return json.loads((CONFIG_DIR / "suppliers.production.json").read_text(encoding="utf-8"))

    def pim_schema(self):
        return json.loads((SCHEMA_DIR / "pim_import.schema.json").read_text(encoding="utf-8"))

    def health(self):
        state = self.load_launch_state()
        return {
            "service": "launch-sequence-maximal",
            "status": "launch_sequence_ready",
            "stages": STAGES,
            "launch_status": state.get("launch", {}).get("status"),
            "live_activation": False,
            "runbook": (DOCS_DIR / "LAUNCH_SEQUENCE_FINAL.md").exists(),
        }

    def build_checks(self, env=None, pim_imported=False, supplier_registered=False):
        payment = self.load_payment_config()
        shipping = self.load_shipping_config()
        marketplaces = self.load_marketplace_config()
        telephony = self.load_telephony_config()
        first_carrier = (shipping.get("carriers") or [{}])[0]
        first_channel = (marketplaces.get("channels") or [{}])[0]
        return {
            "domain_production_server": lambda: validate_environment(env or {}),
            "pim_real_product_data": lambda: {
                "passed": pim_imported,
                "status": "imported" if pim_imported else "pending",
            },
            "supplier": lambda: {
                "passed": supplier_registered,
                "status": "registered" if supplier_registered else "pending",
            },
            "payment": lambda: validate_payment_config(payment),
            "shipping": lambda: validate_shipping_config(
                {
                    "carrier": first_carrier.get("name"),
                    "account_id": first_carrier.get("account_id"),
                    "api_credential": first_carrier.get("api_credential_secret"),
                }
            ),
            "marketplace": lambda: validate_channel(
                {
                    "channel": first_channel.get("name"),
                    "seller_account": first_channel.get("seller_account"),
                    "api_credentials": first_channel.get("api_credentials"),
                }
            ),
            "telephony": lambda: validate_phone(telephony),
            "security_e2e": lambda: {"passed": False, "status": "e2e_not_executed"},
            "launch": lambda: {"passed": False, "status": "blocked_until_all_previous_pass"},
        }

    def run_sequence(self, env=None, pim_imported=False, supplier_registered=False):
        return LaunchOrchestrator(
            self.build_checks(env=env, pim_imported=pim_imported, supplier_registered=supplier_registered)
        ).run()

    def demo_flow(self):
        repo = MemoryProductRepo()
        pipeline = PIMImportPipeline(repo)
        csv_path = DATA_DIR / "import" / "products.example.csv"
        if csv_path.exists():
            pim_result = pipeline.import_csv(csv_path, "demo_csv")
        else:
            pim_result = pipeline.import_items(
                [{"sku": "X", "title": "X", "price": "10", "currency": "EUR", "stock": 2}],
                "demo",
            )
        demo_env = {
            "APP_BASE_URL": "https://buzzard.example",
            "APP_DOMAIN": "buzzard.example",
            "POSTGRES_DB": "b",
            "POSTGRES_USER": "u",
            "POSTGRES_PASSWORD": "p",
        }
        registry = SupplierRegistry()

        class DemoSupplier:
            def health(self):
                return {"status": "ok"}

            def fetch(self):
                return [{"sku": "S1", "title": "Part", "price": "9.99", "currency": "EUR", "stock": 3}]

            def parse(self, payload):
                return payload

        registry.register("demo", DemoSupplier())
        supplier_sync = registry.sync("demo")
        e2e = E2ERunner(
            [
                ("catalog_visible", lambda: len(repo.items) > 0),
                ("search_ready", lambda: True),
                ("checkout_dry_run", lambda: True),
            ]
        ).run()
        return {
            "health": self.health(),
            "launch_state": self.load_launch_state(),
            "pim_import": pim_result,
            "activation_gates": {
                "payment": validate_payment_config(
                    {"provider": "x", "merchant_account": "m", "webhook_secret": "s"}
                ),
                "shipping": validate_shipping_config(
                    {"carrier": "x", "account_id": "a", "api_credential": "c"}
                ),
                "marketplace": validate_channel(
                    {"channel": "eBay", "seller_account": "s", "api_credentials": "c"}
                ),
                "telephony": validate_phone(
                    {
                        "provider": "x",
                        "phone_number": "+1",
                        "credentials": "c",
                        "public_webhook": "https://x",
                        "media_stream": "wss://x",
                    }
                ),
            },
            "preflight_demo": validate_environment(demo_env),
            "supplier_sync": supplier_sync,
            "sequence_current": self.run_sequence(),
            "sequence_partial": self.run_sequence(
                env=demo_env,
                pim_imported=pim_result["imported"] > 0,
                supplier_registered=True,
            ),
            "e2e_dry_run": e2e,
        }
