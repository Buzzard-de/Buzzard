from buzzard_ai_complete.crm.consent_v2 import ConsentLedgerV2
from buzzard_ai_complete.crm.journeys_v2 import CustomerJourneyEngineV2
from buzzard_ai_complete.customer_billing.document_numbering_v2 import DocumentNumbering
from buzzard_ai_complete.customer_billing.ledger_v2 import AccountingLedgerV2
from buzzard_ai_complete.logistics.contracts_v2 import CarrierContractV2, VolumeTier
from buzzard_ai_complete.logistics.models import CarrierQuote
from buzzard_ai_complete.logistics.routing_v2 import ShippingPolicyV2
from buzzard_ai_complete.logistics.webhooks_v2 import CarrierWebhookRegistry
from buzzard_ai_complete.marketing.experiments_v2 import ExperimentResult
from buzzard_ai_complete.marketing.pacing_v2 import budget_pacing
from buzzard_ai_complete.marketing.rules_v2 import MarketingDecisionRulesV2
from buzzard_ai_complete.order_engine.idempotency import IdempotencyStore


def test_logistics_v2_policy():
    quotes = [
        CarrierQuote("A", "std", 5, delivery_days=3),
        CarrierQuote("B", "std", 8, delivery_days=1),
    ]
    assert ShippingPolicyV2(max_price=6).choose(quotes, "cheapest").carrier == "A"


def test_contract_tiers():
    contract = CarrierContractV2("DHL", [VolumeTier(100, 6.5), VolumeTier(500, 5.8)])
    assert contract.rate_for_volume(600, 8) == 5.8


def test_webhook():
    registry = CarrierWebhookRegistry()
    registry.register("DELIVERED", lambda payload: {"status": "OK", "id": payload["id"]})
    assert registry.dispatch("DELIVERED", {"id": "1"})["status"] == "OK"


def test_idempotency():
    store = IdempotencyStore()
    store.put("k", {"status": "DONE"})
    assert store.get("k")["status"] == "DONE"


def test_numbering_and_ledger():
    numbering = DocumentNumbering("INV")
    assert numbering.next() == "INV-00000001"
    ledger = AccountingLedgerV2()
    ledger.post("cash", debit=100, reference="O1")
    ledger.post("cash", credit=40, reference="O2")
    assert ledger.balance("cash") == 60


def test_crm_journey():
    journeys = CustomerJourneyEngineV2()
    assert journeys.enroll("C1", "WELCOME")["status"] == "ACTIVE"
    assert journeys.advance("C1")["step"] == 1


def test_consent_ledger():
    consent = ConsentLedgerV2()
    assert consent.allowed("C1", "marketing") is False
    consent.set("C1", "marketing", True, "checkout")
    assert consent.allowed("C1", "marketing") is True


def test_marketing_experiment():
    assert ExperimentResult("E1", 2.0, 3.0).winner() == "B"


def test_pacing():
    assert budget_pacing(600, 0.5, 1000)["status"] == "OVER_PACE"


def test_marketing_rules():
    rules = MarketingDecisionRulesV2()
    assert rules.decide(1.0) == "PAUSE_OR_REVIEW"
    assert rules.decide(4.0) == "SCALE"
