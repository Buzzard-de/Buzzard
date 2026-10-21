from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.exception.router import AssignmentRouter
from buzzard_ai_complete.ai_core.services.exception_service import ExceptionService


class ExceptionCoordinator:
    def __init__(
        self,
        session: Session,
        exception_service: ExceptionService,
        router: AssignmentRouter | None = None,
    ) -> None:
        self.session = session
        self.exceptions = exception_service
        self.router = router or AssignmentRouter()

    def route_exception(self, exception_id: str, *, actor: str = "exception-coordinator") -> dict[str, Any]:
        record = self.exceptions.get(exception_id)
        if not record:
            raise KeyError(f"exception not found: {exception_id}")
        assignment = self.router.assign(record.type, record.severity, record.worker_id)
        if assignment.get("owner"):
            self.exceptions.transition(
                exception_id,
                "ASSIGNED",
                actor=actor,
                note=f"assigned to {assignment['owner']}",
                assigned_to=assignment["owner"],
            )
        return assignment
