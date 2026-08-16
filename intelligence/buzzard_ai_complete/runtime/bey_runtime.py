"""Runtime bootstrap for Dogu Bey, Aslan Bey, and Esat Bey."""

from __future__ import annotations

import os
import threading
import time
from dataclasses import dataclass
from typing import Any

from buzzard_ai_complete.agents.aslan_bey import AslanBey
from buzzard_ai_complete.agents.dogu_bey import DoguBey
from buzzard_ai_complete.agents.esat_bey import EsatBey
from buzzard_ai_complete.core.registry import AgentRegistry
from buzzard_ai_complete.database.db import init_db
from buzzard_ai_complete.runtime.maintenance import maintain_cycle

BEY_AGENT_ORDER = ("dogu_bey", "aslan_bey", "esat_bey")

BEY_ROLES = {
    "dogu_bey": "Forschung & Verifikation (Intelligence)",
    "aslan_bey": "Koordination & Operationen (Müsteşar)",
    "esat_bey": "Defensive Sicherheit (Cyber Defense)",
}


@dataclass
class BeyRuntimeState:
    started: bool = False
    started_at: str | None = None
    maintenance_thread: threading.Thread | None = None


class BeyRuntime:
    """Singleton runtime that boots and supervises the three Bey agents."""

    _instance: BeyRuntime | None = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._state = BeyRuntimeState()
                cls._instance._dogu: DoguBey | None = None
                cls._instance._aslan: AslanBey | None = None
                cls._instance._esat: EsatBey | None = None
            return cls._instance

    @property
    def dogu(self) -> DoguBey:
        self._ensure_started()
        assert self._dogu is not None
        return self._dogu

    @property
    def aslan(self) -> AslanBey:
        self._ensure_started()
        assert self._aslan is not None
        return self._aslan

    @property
    def esat(self) -> EsatBey:
        self._ensure_started()
        assert self._esat is not None
        return self._esat

    def _ensure_started(self) -> None:
        if not self._state.started:
            self.start()

    def start(self, *, background_maintenance: bool | None = None) -> dict[str, Any]:
        with self._lock:
            if self._state.started:
                return self.status()

            init_db()
            registry = AgentRegistry()
            for name in BEY_AGENT_ORDER:
                registry.register(name, BEY_ROLES[name], status="ACTIVE")

            self._dogu = DoguBey()
            self._aslan = AslanBey()
            self._esat = EsatBey()

            from buzzard_ai_complete.core.time import now

            self._state.started_at = now()
            self._state.started = True

            self._esat.record(
                "INFO",
                "BEY_RUNTIME_START",
                "dogu_bey, aslan_bey, esat_bey started",
                actor="bey_runtime",
            )

            if background_maintenance is None:
                background_maintenance = os.getenv("BUZZARD_BEY_MAINTENANCE", "1") == "1"

            if background_maintenance and self._state.maintenance_thread is None:
                interval = int(os.getenv("BUZZARD_BEY_MAINTENANCE_INTERVAL", "300"))
                limit = int(os.getenv("BUZZARD_BEY_MAINTENANCE_LIMIT", "1"))
                thread = threading.Thread(
                    target=self._maintenance_loop,
                    args=(interval, limit),
                    name="bey-maintenance",
                    daemon=True,
                )
                thread.start()
                self._state.maintenance_thread = thread

            return self.status()

    def _maintenance_loop(self, interval_seconds: int, process_limit: int) -> None:
        while self._state.started:
            try:
                maintain_cycle(cancel_tests=False, process_limit=process_limit)
            except Exception as exc:  # noqa: BLE001 — keep supervisor alive
                if self._esat is not None:
                    self._esat.record("MEDIUM", "BEY_MAINTENANCE_ERROR", str(exc), actor="bey_runtime")
            time.sleep(max(30, interval_seconds))

    def status(self) -> dict[str, Any]:
        agents = []
        for name in BEY_AGENT_ORDER:
            agents.append(
                {
                    "name": name,
                    "role": BEY_ROLES[name],
                    "status": "RUNNING" if self._state.started else "STOPPED",
                }
            )

        return {
            "service": "bey-runtime",
            "started": self._state.started,
            "started_at": self._state.started_at,
            "agents": agents,
            "agent_count": len(agents),
            "maintenance_thread": bool(
                self._state.maintenance_thread and self._state.maintenance_thread.is_alive()
            ),
        }

    def dashboard(self) -> dict[str, Any]:
        self._ensure_started()
        assert self._aslan is not None and self._esat is not None
        return {
            "runtime": self.status(),
            "operations": self._aslan.dashboard(),
            "security_events": self._esat.recent(limit=10),
        }


def start_bey_agents(**kwargs: Any) -> dict[str, Any]:
    return BeyRuntime().start(**kwargs)
