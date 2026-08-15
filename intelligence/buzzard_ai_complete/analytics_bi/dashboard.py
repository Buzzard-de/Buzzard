class ExecutiveDashboard:
    def render(self, kpis, alerts=None):
        return {
            "kpis": {kpi.name: {"value": kpi.value, "unit": kpi.unit, "target": kpi.target} for kpi in kpis},
            "alerts": [alert.__dict__ for alert in (alerts or [])],
        }
