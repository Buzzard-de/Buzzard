from buzzard_ai_complete.analytics_bi.alerts import AlertEngine
from buzzard_ai_complete.analytics_bi.dashboard import ExecutiveDashboard
from buzzard_ai_complete.analytics_bi.metrics import (
    ad_roas,
    costs,
    gross_profit,
    order_count,
    refund_total,
    return_rate,
    revenue,
)
from buzzard_ai_complete.analytics_bi.models import KPI


class AnalyticsBIEngine:
    def __init__(self):
        self.alerts = AlertEngine()
        self.dashboard = ExecutiveDashboard()

    def kpis(self, events):
        revenue_value = revenue(events)
        costs_value = costs(events)
        gross_profit_value = gross_profit(events)
        return [
            KPI("revenue", revenue_value, "EUR"),
            KPI("costs", costs_value, "EUR"),
            KPI("gross_profit", gross_profit_value, "EUR"),
            KPI("orders", order_count(events), "count"),
            KPI("refunds", refund_total(events), "EUR"),
            KPI("return_rate", return_rate(events), "ratio"),
            KPI("ad_roas", ad_roas(events), "x"),
        ]

    def dashboard_snapshot(self, events):
        kpi_list = self.kpis(events)
        alerts = []
        margin = (gross_profit(events) / revenue(events)) if revenue(events) else 0
        alert = self.alerts.low_margin(margin)
        if alert:
            alerts.append(alert)
        rate = return_rate(events)
        alert = self.alerts.high_return_rate(rate)
        if alert:
            alerts.append(alert)
        return self.dashboard.render(kpi_list, alerts)
