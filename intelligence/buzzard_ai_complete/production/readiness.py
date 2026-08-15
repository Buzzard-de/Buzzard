from dataclasses import dataclass


@dataclass
class ReadinessCheck:
    name: str
    status: str
    blocking: bool
    detail: str = ""


class ProductionReadiness:
    def evaluate(
        self,
        integrations,
        catalog_count=0,
        payment_configured=False,
        shipping_configured=False,
        ai_configured=False,
    ):
        checks = []
        checks.append(
            ReadinessCheck(
                "catalog",
                "READY" if catalog_count > 0 else "BLOCKED",
                catalog_count == 0,
                f"{catalog_count} active products",
            )
        )
        checks.append(
            ReadinessCheck(
                "payment",
                "READY" if payment_configured else "BLOCKED",
                not payment_configured,
                "payment provider configuration",
            )
        )
        checks.append(
            ReadinessCheck(
                "shipping",
                "READY" if shipping_configured else "BLOCKED",
                not shipping_configured,
                "carrier configuration",
            )
        )
        checks.append(
            ReadinessCheck(
                "ai",
                "READY" if ai_configured else "DEGRADED",
                False,
                "LLM/agent configuration",
            )
        )
        for name, status in integrations.items():
            checks.append(ReadinessCheck(name, status["status"], False, "external integration"))
        return {
            "ready": not any(check.blocking for check in checks),
            "checks": [check.__dict__ for check in checks],
        }
