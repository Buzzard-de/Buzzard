from buzzard_ai_complete.analytics_bi.anomalies import detect_spike
from buzzard_ai_complete.analytics_bi.cohorts import CohortEngine
from buzzard_ai_complete.analytics_bi.decision_intelligence import DecisionIntelligence
from buzzard_ai_complete.analytics_bi.engine import AnalyticsBIEngine
from buzzard_ai_complete.analytics_bi.export import to_json
from buzzard_ai_complete.analytics_bi.forecast import forecast_next
from buzzard_ai_complete.analytics_bi.models import BusinessEvent
from buzzard_ai_complete.analytics_bi.profitability import product_profit
from buzzard_ai_complete.analytics_bi.segments import rank_products


class AnalyticsBIService:
    def __init__(self, engine=None):
        self.engine = engine or AnalyticsBIEngine()

    @staticmethod
    def sample_events():
        return [
            BusinessEvent("1", "ORDER", "2026-01-01"),
            BusinessEvent("2", "SALE", "2026-01-01", 100, 60),
            BusinessEvent("3", "AD_SPEND", "2026-01-01", 0, 20),
            BusinessEvent("4", "ATTRIBUTED_SALE", "2026-01-01", 80, 0),
        ]

    def demo_flow(self):
        events = self.sample_events()
        snapshot = self.engine.dashboard_snapshot(events)
        return {
            "dashboard": snapshot,
            "decision": DecisionIntelligence().recommend(snapshot),
            "product_profit": product_profit(20, 10, 2, 2, 1),
            "forecast": forecast_next([10, 20, 30], 3),
            "anomaly_spike": detect_spike(200, 100),
            "cohorts": CohortEngine().build(
                [
                    {"cohort": "2026-01", "revenue": 100},
                    {"cohort": "2026-01", "revenue": 50},
                ]
            ),
            "product_ranking": rank_products(
                [
                    {"sku": "A", "profit": 5},
                    {"sku": "B", "profit": 12},
                ]
            ),
            "export_preview": to_json(snapshot)[:200],
        }

    def dashboard(self, events=None):
        event_list = events or self.sample_events()
        snapshot = self.engine.dashboard_snapshot(event_list)
        return {
            "dashboard": snapshot,
            "decision": DecisionIntelligence().recommend(snapshot),
        }
