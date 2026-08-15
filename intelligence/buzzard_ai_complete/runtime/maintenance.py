import json
import os
import time
from typing import Any

from buzzard_ai_complete.agents.aslan_bey import AslanBey
from buzzard_ai_complete.agents.esat_bey import EsatBey
from buzzard_ai_complete.core.orchestrator import BuzzardOrchestrator
from buzzard_ai_complete.core.registry import AgentRegistry
from buzzard_ai_complete.database.db import init_db
from buzzard_ai_complete.monitoring.health import health
from buzzard_ai_complete.tasks.manager import TaskManager

TEST_TASK_TITLES = frozenset(
    {
        "SMOKE-001",
        "Buzzard demo",
        "Aslan-Test",
        "T-CHAIN",
        "T-ASLAN",
        "Gesamt-Aslan",
        "Smoke",
        "v1-Test",
        "Test Recherche",
    }
)


def _bootstrap():
    init_db()
    registry = AgentRegistry()
    registry.register("dogu_bey", "Uzman İstihbarat ve Araştırma AI")
    registry.register("aslan_bey", "Müsteşar / AI Operasyon ve İstihbarat Koordinatörü")
    registry.register("esat_bey", "AI Siber Güvenlik ve Savunma Uzmanı")


def maintain_cycle(*, cancel_tests: bool = False, process_limit: int = 0) -> dict[str, Any]:
    """One maintenance pass: optional test cleanup, task processing, security audit."""
    _bootstrap()
    aslan = AslanBey()
    esat = EsatBey()
    tasks = TaskManager()
    results: dict[str, Any] = {
        "cancelled": [],
        "processed": [],
        "security_issues": 0,
        "health": {},
        "open_tasks": 0,
    }

    if cancel_tests:
        for task in tasks.list("PENDING"):
            if task["title"] in TEST_TASK_TITLES:
                tasks.update(task["id"], "CANCELLED")
                results["cancelled"].append(task["id"])

    pending = [t for t in tasks.list("PENDING") if t["title"] not in TEST_TASK_TITLES]
    results["open_tasks"] = len(pending)

    orchestrator = BuzzardOrchestrator()
    for task in pending[: max(0, process_limit)]:
        outcome = orchestrator.run(
            f"T-{task['id']}",
            task["description"] or task["title"],
            task["priority"],
        )
        results["processed"].append(
            {
                "task_id": task["id"],
                "title": task["title"],
                "status": outcome["task"].status,
            }
        )

    claim_issues = aslan.audit_claims()
    results["security_issues"] = len(claim_issues)
    results["health"] = health()

    esat.record(
        "INFO",
        "MAINTENANCE_CYCLE",
        json.dumps(
            {
                "cancelled": len(results["cancelled"]),
                "processed": len(results["processed"]),
                "open_tasks": results["open_tasks"],
                "security_issues": results["security_issues"],
            },
            ensure_ascii=False,
        ),
    )
    return results


def run_scheduler_loop(interval_seconds: int | None = None, process_limit: int | None = None) -> None:
    """Run maintenance cycles until interrupted (for Docker/systemd)."""
    interval = interval_seconds or int(os.getenv("BUZZARD_SCHEDULER_INTERVAL", "300"))
    limit = process_limit if process_limit is not None else int(
        os.getenv("BUZZARD_SCHEDULER_PROCESS_LIMIT", "1")
    )
    while True:
        maintain_cycle(cancel_tests=False, process_limit=limit)
        time.sleep(interval)
