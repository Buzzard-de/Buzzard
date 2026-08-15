from statistics import mean

class ForecastEngine:
    def moving_average(self, history, periods=7):
        values=[float(x) for x in history[-periods:]]
        return mean(values) if values else 0.0

    def forecast(self, history, horizon=7, periods=7):
        base=self.moving_average(history, periods)
        return {"horizon":horizon,"daily_forecast":[base]*horizon,"method":"moving_average"}

    def reorder_point(self, daily_demand, lead_time_days, safety_stock):
        return max(0, daily_demand*lead_time_days+safety_stock)
