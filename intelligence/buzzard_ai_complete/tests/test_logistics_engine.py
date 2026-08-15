from buzzard_ai_complete.logistics.engine import SmartShippingEngine
from buzzard_ai_complete.logistics.models import Destination, Parcel
from buzzard_ai_complete.logistics.rules import validate_parcel
from buzzard_ai_complete.logistics.volume_contracts import CarrierVolumeContract


def test_cheapest_carrier():
    engine = SmartShippingEngine()
    d = engine.choose(Parcel(2, 30, 20, 15), Destination("DE", "35075"), "cheapest")
    assert d.selected is not None
    assert d.selected.carrier == "Hermes"


def test_fastest_carrier():
    engine = SmartShippingEngine()
    d = engine.choose(Parcel(2, 30, 20, 15), Destination("DE", "35075"), "fastest")
    assert d.selected is not None


def test_invalid_parcel():
    assert "weight_must_be_positive" in validate_parcel(Parcel(0, 30, 20, 15))


def test_volume_contract():
    c = CarrierVolumeContract("DHL", 1000, discount_percent=10)
    assert c.effective_rate(10) == 9.0


def test_unconfigured_dhl_does_not_fake_success():
    result = SmartShippingEngine().track("DHL", "TEST123")
    assert result["status"] == "NOT_CONFIGURED"
