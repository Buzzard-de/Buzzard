from __future__ import annotations

from buzzard_ai_complete.config import settings


class PolicyEngine:
    """RBAC, namespace guard, and approval role checks."""

    def __init__(self, approver_roles: frozenset[str] | None = None) -> None:
        self.approver_roles = approver_roles or settings.APPROVER_ROLES

    def can_approve(self, actor_role: str) -> bool:
        return actor_role.strip().lower() in self.approver_roles

    def can_write_namespace(self, actor_role: str, namespace: str) -> bool:
        role = actor_role.strip().lower()
        if role in {"admin", "system"}:
            return True
        if namespace.startswith("security/") and role != "security":
            return False
        return role in self.approver_roles or role in {"api-user", "operator", "worker"}

    def requires_review_for_risk(self, risk_level: str) -> bool:
        return risk_level in {"HIGH", "CRITICAL"}
