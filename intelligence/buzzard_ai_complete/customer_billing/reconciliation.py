class ReconciliationEngine:
    def reconcile(self, expected, received):
        expected = round(float(expected), 2)
        received = round(float(received), 2)
        return {
            "expected": expected,
            "received": received,
            "difference": round(received - expected, 2),
            "matched": abs(received - expected) < 0.01,
        }
