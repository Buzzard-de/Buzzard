from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.models.worker_state import WorkerState


class WorkerStateService:
    STATUS_ACTIVE = "ACTIVE"
    STATUS_HALTED = "HALTED"

    def __init__(self, session: Session):
        self.session = session

    def halt_worker(
        self,
        worker_id: str,
        *,
        reason: str,
        halted_by: str,
        exception_id: str | None = None,
        metadata: dict | None = None,
    ) -> WorkerState:
        state = self.session.get(WorkerState, worker_id)
        now = datetime.now(timezone.utc)
        if state is None:
            state = WorkerState(worker_id=worker_id)
            self.session.add(state)
        state.status = self.STATUS_HALTED
        state.halt_reason = reason
        state.halted_at = now
        state.halted_by = halted_by
        state.exception_id = exception_id
        state.extra_metadata = metadata
        state.updated_at = now
        self.session.flush()
        return state

    def resume_worker(self, worker_id: str) -> WorkerState | None:
        state = self.session.get(WorkerState, worker_id)
        if state is None:
            return None
        now = datetime.now(timezone.utc)
        state.status = self.STATUS_ACTIVE
        state.halt_reason = None
        state.halted_at = None
        state.halted_by = None
        state.exception_id = None
        state.updated_at = now
        self.session.flush()
        return state

    def is_halted(self, worker_id: str) -> bool:
        state = self.session.get(WorkerState, worker_id)
        return state is not None and state.status == self.STATUS_HALTED

    def get(self, worker_id: str) -> WorkerState | None:
        return self.session.get(WorkerState, worker_id)

    def list_halted(self) -> list[WorkerState]:
        return (
            self.session.query(WorkerState)
            .filter(WorkerState.status == self.STATUS_HALTED)
            .order_by(WorkerState.halted_at.desc())
            .all()
        )
