from __future__ import annotations

import time
from typing import Callable

from buzzard_ai_complete.ai_core.database.base import session_scope
from buzzard_ai_complete.ai_core.services.audit_service import AuditService
from buzzard_ai_complete.ai_core.services.exception_service import ExceptionService
from buzzard_ai_complete.ai_core.services.memory_service import CentralMemoryService
from buzzard_ai_complete.ai_core.services.orchestrator import UnifiedOrchestrator
from buzzard_ai_complete.config import settings


class TaskQueuePoller:
    """Simple in-process queue poller for QUEUED/RETRY tasks."""

    def __init__(
        self,
        interval_seconds: int | None = None,
        orchestrator_factory: Callable[[], UnifiedOrchestrator] | None = None,
    ) -> None:
        self.interval_seconds = interval_seconds or settings.BUZZARD_WORKER_POLL_INTERVAL_SECONDS
        self._orchestrator_factory = orchestrator_factory

    def _build_orchestrator(self) -> UnifiedOrchestrator:
        if self._orchestrator_factory:
            return self._orchestrator_factory()
        with session_scope() as session:
            audit = AuditService(session)
            memory = CentralMemoryService(session, audit, "poller")
            exceptions = ExceptionService(session, audit, "poller")
            return UnifiedOrchestrator(session, audit, memory, exceptions, "poller")

    def poll_once(self) -> bool:
        with session_scope() as session:
            audit = AuditService(session)
            memory = CentralMemoryService(session, audit, "poller")
            exceptions = ExceptionService(session, audit, "poller")
            orchestrator = UnifiedOrchestrator(session, audit, memory, exceptions, "poller")
            task = orchestrator.run_cycle(actor="poller")
            return task is not None

    def run(self, max_iterations: int | None = None) -> int:
        processed = 0
        iterations = 0
        while max_iterations is None or iterations < max_iterations:
            if not self.poll_once():
                time.sleep(self.interval_seconds)
            else:
                processed += 1
            iterations += 1
        return processed
