class CohortEngine:
    def build(self, customers):
        result = {}
        for customer in customers:
            cohort = customer.get("cohort", "unknown")
            result.setdefault(cohort, {"customers": 0, "revenue": 0.0})
            result[cohort]["customers"] += 1
            result[cohort]["revenue"] += float(customer.get("revenue", 0))
        for entry in result.values():
            entry["revenue"] = round(entry["revenue"], 2)
            entry["revenue_per_customer"] = round(entry["revenue"] / entry["customers"], 2) if entry["customers"] else 0
        return result
