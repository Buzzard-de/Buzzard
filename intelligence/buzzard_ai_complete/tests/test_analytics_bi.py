from buzzard_ai_complete.analytics_bi.anomalies import detect_spike
from buzzard_ai_complete.analytics_bi.cohorts import CohortEngine
from buzzard_ai_complete.analytics_bi.data_quality import validate_event
from buzzard_ai_complete.analytics_bi.decision_intelligence import DecisionIntelligence
from buzzard_ai_complete.analytics_bi.engine import AnalyticsBIEngine
from buzzard_ai_complete.analytics_bi.forecast import forecast_next
from buzzard_ai_complete.analytics_bi.models import BusinessEvent
from buzzard_ai_complete.analytics_bi.profitability import product_profit


def sample_events():
    return [
        BusinessEvent("1", "ORDER", "2026-01-01"),
        BusinessEvent("2", "SALE", "2026-01-01", 100, 60),
        BusinessEvent("3", "AD_SPEND", "2026-01-01", 0, 20),
        BusinessEvent("4", "ATTRIBUTED_SALE", "2026-01-01", 80, 0),
    ]


def test_kpis():
    kpis = AnalyticsBIEngine().kpis(sample_events())
    values = {kpi.name: kpi.value for kpi in kpis}
    assert values["revenue"] == 100
    assert values["gross_profit"] == 20
    assert values["orders"] == 1
    assert values["ad_roas"] == 4


def test_dashboard_and_decision():
    snapshot = AnalyticsBIEngine().dashboard_snapshot(sample_events())
    assert "kpis" in snapshot
    assert DecisionIntelligence().recommend(snapshot) in {
        "SCALE_PROFITABLE_MARKETING",
        "OPTIMIZE_AND_MONITOR",
        "INVESTIGATE_RETURNS",
        "PROTECT_CASH_AND_REVIEW_COSTS",
    }


def test_profitability():
    result = product_profit(20, 10, 2, 2, 1)
    assert result["profit"] == 5
    assert result["margin"] == 0.25


def test_forecast():
    assert forecast_next([10, 20, 30], 3) == 20


def test_anomaly():
    assert detect_spike(200, 100) is True


def test_cohort():
    cohorts = CohortEngine().build(
        [
            {"cohort": "2026-01", "revenue": 100},
            {"cohort": "2026-01", "revenue": 50},
        ]
    )
    assert cohorts["2026-01"]["customers"] == 2
    assert cohorts["2026-01"]["revenue"] == 150


def test_data_quality():
    assert validate_event(sample_events()[0]) == []
