from __future__ import annotations

import concurrent.futures
from typing import Any

from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.models.task import Task
from buzzard_ai_complete.ai_core.services.audit_service import AuditService
from buzzard_ai_complete.ai_core.workers.base import (
    Worker,
    WorkerContext,
    WorkerExecutionError,
    WorkerResult,
    WorkerTimeoutError,
)
from buzzard_ai_complete.ai_core.workers.registry import WorkerRegistry, build_default_registry


class WorkerExecutor:
    def __init__(
        self,
        session: Session,
        audit: AuditService,
        request_id: str,
        registry: WorkerRegistry | None = None,
    ):
        self.session = session
        self.audit = audit
        self.request_id = request_id
        self.registry = registry or build_default_registry()

    def execute(self, task: Task) -> WorkerResult:
        worker = self.registry.get_for_task(task.type, task.worker_id)
        if worker is None:
            raise WorkerExecutionError(
                f"no worker registered for task type {task.type!r} / worker {task.worker_id!r}",
                retryable=False,
            )
        context = WorkerContext(
            task_id=task.id,
            worker_id=worker.worker_id,
            request_id=self.request_id,
            attempt=task.attempts,
            timeout_seconds=task.timeout_seconds,
        )
        self.audit.log(
            actor=worker.worker_id,
            action="worker.execute.start",
            request_id=self.request_id,
            entity_type="task",
            entity_id=task.id,
            task_id=task.id,
            worker_id=worker.worker_id,
            after_state={"task_type": task.type, "attempt": task.attempts},
        )
        result = self._run_with_timeout(worker, task.type, task.payload or {}, context)
        self.audit.log(
            actor=worker.worker_id,
            action="worker.execute.finish",
            request_id=self.request_id,
            entity_type="task",
            entity_id=task.id,
            task_id=task.id,
            worker_id=worker.worker_id,
            after_state={"success": result.success, "duration_ms": result.metadata.get("duration_ms")},
        )
        return result

    def _run_with_timeout(
        self,
        worker: Worker,
        task_type: str,
        payload: dict[str, Any],
        context: WorkerContext,
    ) -> WorkerResult:
        timeout = max(1, min(context.timeout_seconds, 3600))
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(worker.execute, task_type, payload, context)
            try:
                return future.result(timeout=timeout)
            except concurrent.futures.TimeoutError as exc:
                raise WorkerTimeoutError(f"worker {worker.worker_id} timed out after {timeout}s") from exc
            except WorkerExecutionError:
                raise
            except Exception as exc:
                raise WorkerExecutionError(str(exc), retryable=True) from exc
