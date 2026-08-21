from buzzard_ai_complete.ai_core.services.audit_service import AuditService
from buzzard_ai_complete.ai_core.services.exception_service import ExceptionService
from buzzard_ai_complete.ai_core.services.memory_service import CentralMemoryService

__all__ = [
    "AuditService",
    "CentralMemoryService",
    "ExceptionService",
    "UnifiedOrchestrator",
]


def __getattr__(name: str):
    if name == "UnifiedOrchestrator":
        from buzzard_ai_complete.ai_core.services.orchestrator import UnifiedOrchestrator

        return UnifiedOrchestrator
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
