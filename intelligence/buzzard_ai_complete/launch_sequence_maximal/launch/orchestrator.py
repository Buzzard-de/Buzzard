from dataclasses import dataclass, field

STAGES = [
    "domain_production_server",
    "pim_real_product_data",
    "supplier",
    "payment",
    "shipping",
    "marketplace",
    "telephony",
    "security_e2e",
    "launch",
]


@dataclass
class StageResult:
    name: str
    passed: bool
    details: dict = field(default_factory=dict)


class LaunchOrchestrator:
    def __init__(self, checks):
        self.checks = checks

    def run(self):
        results = []
        blocked = False
        for stage in STAGES:
            if blocked:
                results.append(StageResult(stage, False, {"status": "blocked_by_previous_stage"}))
                continue
            check = self.checks.get(stage)
            if not check:
                results.append(StageResult(stage, False, {"status": "check_not_configured"}))
                blocked = True
                continue
            try:
                details = check()
                ok = bool(details.get("passed", False))
            except Exception as exc:
                details = {"error": type(exc).__name__}
                ok = False
            results.append(StageResult(stage, ok, details))
            if not ok:
                blocked = True
        return {
            "launch_ready": all(result.passed for result in results),
            "results": [result.__dict__ for result in results],
        }
