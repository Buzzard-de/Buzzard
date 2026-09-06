from enum import Enum


class TaskStatus(str, Enum):
    QUEUED = "QUEUED"
    VALIDATING = "VALIDATING"
    ASSIGNED = "ASSIGNED"
    RUNNING = "RUNNING"
    REVIEW = "REVIEW"
    APPROVED = "APPROVED"
    EXECUTED = "EXECUTED"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    RETRY = "RETRY"
    BLOCKED = "BLOCKED"
    ESCALATED = "ESCALATED"
    CANCELLED = "CANCELLED"


class TaskPriority(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class MemoryType(str, Enum):
    FACT = "FACT"
    SIGNAL = "SIGNAL"
    DECISION = "DECISION"
    INSIGHT = "INSIGHT"
    EVENT = "EVENT"
    TASK_RESULT = "TASK_RESULT"
    RULE = "RULE"
    POLICY = "POLICY"
    EXCEPTION = "EXCEPTION"


class MemoryImpact(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ExceptionSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ExceptionStatus(str, Enum):
    DETECTED = "DETECTED"
    CLASSIFIED = "CLASSIFIED"
    CONTAINED = "CONTAINED"
    ASSIGNED = "ASSIGNED"
    REVIEW = "REVIEW"
    RESOLVED = "RESOLVED"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AuditResult(str, Enum):
    OK = "OK"
    FAIL = "FAIL"
    DENIED = "DENIED"
    BLOCKED = "BLOCKED"


TERMINAL_TASK_STATUSES = frozenset(
    {TaskStatus.SUCCESS, TaskStatus.FAILED, TaskStatus.CANCELLED}
)

TASK_TRANSITIONS: dict[TaskStatus, frozenset[TaskStatus]] = {
    TaskStatus.QUEUED: frozenset({TaskStatus.VALIDATING, TaskStatus.CANCELLED}),
    TaskStatus.VALIDATING: frozenset(
        {TaskStatus.ASSIGNED, TaskStatus.FAILED, TaskStatus.BLOCKED, TaskStatus.CANCELLED}
    ),
    TaskStatus.ASSIGNED: frozenset(
        {TaskStatus.RUNNING, TaskStatus.FAILED, TaskStatus.CANCELLED, TaskStatus.BLOCKED}
    ),
    TaskStatus.RUNNING: frozenset(
        {
            TaskStatus.REVIEW,
            TaskStatus.EXECUTED,
            TaskStatus.SUCCESS,
            TaskStatus.FAILED,
            TaskStatus.RETRY,
            TaskStatus.BLOCKED,
            TaskStatus.ESCALATED,
            TaskStatus.CANCELLED,
        }
    ),
    TaskStatus.REVIEW: frozenset(
        {TaskStatus.APPROVED, TaskStatus.FAILED, TaskStatus.ESCALATED, TaskStatus.CANCELLED}
    ),
    TaskStatus.APPROVED: frozenset(
        {TaskStatus.EXECUTED, TaskStatus.FAILED, TaskStatus.CANCELLED}
    ),
    TaskStatus.EXECUTED: frozenset({TaskStatus.SUCCESS, TaskStatus.FAILED}),
    TaskStatus.RETRY: frozenset({TaskStatus.QUEUED, TaskStatus.CANCELLED}),
    TaskStatus.FAILED: frozenset({TaskStatus.RETRY, TaskStatus.ESCALATED, TaskStatus.CANCELLED}),
    TaskStatus.BLOCKED: frozenset({TaskStatus.REVIEW, TaskStatus.CANCELLED, TaskStatus.ESCALATED}),
    TaskStatus.ESCALATED: frozenset({TaskStatus.REVIEW, TaskStatus.CANCELLED, TaskStatus.FAILED}),
    TaskStatus.SUCCESS: frozenset(),
    TaskStatus.CANCELLED: frozenset(),
}

EXCEPTION_TRANSITIONS: dict[ExceptionStatus, frozenset[ExceptionStatus]] = {
    ExceptionStatus.DETECTED: frozenset(
        {ExceptionStatus.CLASSIFIED, ExceptionStatus.CONTAINED, ExceptionStatus.RESOLVED}
    ),
    ExceptionStatus.CLASSIFIED: frozenset(
        {ExceptionStatus.CONTAINED, ExceptionStatus.ASSIGNED, ExceptionStatus.RESOLVED}
    ),
    ExceptionStatus.CONTAINED: frozenset({ExceptionStatus.ASSIGNED, ExceptionStatus.REVIEW}),
    ExceptionStatus.ASSIGNED: frozenset({ExceptionStatus.REVIEW, ExceptionStatus.RESOLVED}),
    ExceptionStatus.REVIEW: frozenset({ExceptionStatus.RESOLVED}),
    ExceptionStatus.RESOLVED: frozenset(),
}
