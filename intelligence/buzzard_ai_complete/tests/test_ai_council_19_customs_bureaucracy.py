from buzzard_ai_complete.ai_council_19_customs_bureaucracy.council.registry19 import build_registry19
from buzzard_ai_complete.ai_council_19_customs_bureaucracy.customs.alerts.risk import CustomsRiskEngine
from buzzard_ai_complete.ai_council_19_customs_bureaucracy.customs.calculators.landed_cost import LandedCostCalculator
from buzzard_ai_complete.ai_council_19_customs_bureaucracy.customs.documents.checklist import CustomsDocumentChecklist
from buzzard_ai_complete.ai_council_19_customs_bureaucracy.customs.models import ProductTradeProfile, TradeRoute
from buzzard_ai_complete.ai_council_19_customs_bureaucracy.service import AiCouncil19Service


def test_landed_cost():
    result = LandedCostCalculator().calculate(100, 10, 0, 0.10, 0.19, 5)
    assert result["duty"] == "11.00" and result["landed_cost"] == "148.99"


def test_risk():
    result = CustomsRiskEngine().assess(
        ProductTradeProfile("p", "battery charger"),
        TradeRoute("DE", "TR"),
    )
    assert "special_product_controls_possible" in result["risks"]


def test_documents():
    profile = ProductTradeProfile("p", "x", origin_country="DE", licenses=["license_check"])
    docs = CustomsDocumentChecklist().required(TradeRoute("DE", "TR"), profile)
    assert "commercial_invoice" in docs and "license_check" in docs


def test_19th_agent():
    router = build_registry19()
    assert len(router.all()) == 19
    assert router.get("customs_bureaucracy_ai").name == "Customs & Bureaucracy AI"


def test_service_health():
    health = AiCouncil19Service().health()
    assert health["status"] == "maximal_customs_ai_ready"
    assert health["agents"] == 19
    assert health["live_activation"] is False
