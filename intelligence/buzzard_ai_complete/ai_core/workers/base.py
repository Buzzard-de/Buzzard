from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class WorkerContext:
    task_id: str
    worker_id: str
    request_id: str
    attempt: int
    timeout_seconds: int


@dataclass
class WorkerResult:
    success: bool
    output: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)
    error: str | None = None
    retryable: bool = True

    def to_dict(self) -> dict[str, Any]:
        return {
            "success": self.success,
            "output": self.output,
            "metadata": self.metadata,
            "error": self.error,
            "worker_id": self.metadata.get("worker_id"),
            "execution_mode": self.metadata.get("execution_mode", "deterministic"),
            "duration_ms": self.metadata.get("duration_ms"),
            "ai_provider_status": self.metadata.get("ai_provider_status"),
        }


class WorkerExecutionError(Exception):
    def __init__(self, message: str, *, retryable: bool = True):
        super().__init__(message)
        self.retryable = retryable


class WorkerTimeoutError(WorkerExecutionError):
    def __init__(self, message: str):
        super().__init__(message, retryable=True)


class Worker(ABC):
    worker_id: str
    supported_task_types: frozenset[str]

    @abstractmethod
    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        """Execute deterministic business logic for a validated task."""
