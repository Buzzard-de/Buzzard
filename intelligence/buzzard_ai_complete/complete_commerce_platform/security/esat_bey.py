class EsatBeyDefense:
    def inspect(self, event):
        findings = []
        if event.get("failed_auth_count", 0) >= 5:
            findings.append("BRUTE_FORCE_SIGNAL")
        if event.get("invalid_webhook"):
            findings.append("INVALID_WEBHOOK")
        if event.get("unexpected_rate", 0) > 100:
            findings.append("RATE_ANOMALY")
        return {
            "risk": "high" if findings else "normal",
            "findings": findings,
            "action": "isolate_and_alert" if findings else "allow",
        }
