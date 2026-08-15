class SalesGate:
    REQUIRED = ("catalog", "payment", "shipping", "order_pipeline", "intelligence_bridge")

    def evaluate(self, status):
        missing = [key for key in self.REQUIRED if status.get(key) != "READY"]
        return {"sales_enabled": not missing, "missing": missing}

    def enforce(self, status):
        result = self.evaluate(status)
        if not result["sales_enabled"]:
            raise RuntimeError("SALES_BLOCKED:" + ",".join(result["missing"]))
        return True
