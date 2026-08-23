from __future__ import annotations

ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    "admin": frozenset(
        {
            "tasks:create",
            "tasks:transition",
            "tasks:approve",
            "memory:read",
            "memory:write",
            "exceptions:create",
            "exceptions:transition",
            "audit:read",
            "agents:read",
            "agents:execute",
            "approvals:read",
            "categories:read",
            "categories:execute",
            "commerce:write",
            "integrations:read",
            "integrations:execute",
            "reports:read",
            "reports:create",
            "events:read",
            "events:admin",
            "suppliers:read",
            "suppliers:write",
            "suppliers:sync",
            "products:read",
            "products:enrich",
            "pricing:read",
            "pricing:evaluate",
            "pricing:publish",
            "stock:read",
            "stock:sync",
            "orders:read",
            "orders:ingest",
            "returns:read",
            "returns:evaluate",
            "logistics:read",
            "logistics:execute",
            "market:read",
            "analytics:read",
            "decisions:read",
            "decisions:execute",
            "decisions:write",
            "procurement:draft",
        }
    ),
    "operator": frozenset(
        {
            "tasks:create",
            "tasks:transition",
            "memory:read",
            "memory:write",
            "exceptions:create",
            "exceptions:transition",
            "agents:read",
            "agents:execute",
            "approvals:read",
            "categories:read",
            "categories:execute",
            "commerce:write",
            "integrations:read",
            "integrations:execute",
            "reports:read",
            "reports:create",
            "events:read",
            "suppliers:read",
            "suppliers:write",
            "suppliers:sync",
            "products:read",
            "products:enrich",
            "pricing:read",
            "pricing:evaluate",
            "pricing:publish",
            "stock:read",
            "stock:sync",
            "orders:read",
            "orders:ingest",
            "returns:read",
            "returns:evaluate",
            "logistics:read",
            "logistics:execute",
            "market:read",
            "analytics:read",
            "decisions:read",
            "decisions:execute",
            "procurement:draft",
        }
    ),
    "approver": frozenset(
        {
            "tasks:transition",
            "tasks:approve",
            "approvals:read",
            "commerce:write",
            "audit:read",
        }
    ),
    "analyst": frozenset(
        {
            "memory:read",
            "audit:read",
            "agents:read",
            "categories:read",
            "integrations:read",
            "reports:read",
            "events:read",
            "suppliers:read",
            "products:read",
            "returns:read",
            "analytics:read",
            "decisions:read",
        }
    ),
    "security": frozenset(
        {
            "exceptions:transition",
            "audit:read",
            "agents:read",
        }
    ),
    "system": frozenset(
        {
            "tasks:create",
            "memory:read",
            "memory:write",
            "exceptions:create",
            "integrations:execute",
            "events:read",
        }
    ),
    "integration-service": frozenset(
        {
            "integrations:execute",
            "integrations:read",
            "events:read",
        }
    ),
    "api-user": frozenset({"tasks:create", "memory:read", "memory:write"}),
}

ENDPOINT_PERMISSIONS: dict[tuple[str, str], str] = {
    ("POST", "/api/v1/tasks"): "tasks:create",
    ("GET", "/api/v1/tasks"): "tasks:create",
    ("GET", "/api/v1/tasks/{task_id}"): "tasks:create",
    ("POST", "/api/v1/tasks/{task_id}/transition"): "tasks:transition",
    ("POST", "/api/v1/tasks/run-cycle"): "tasks:create",
    ("POST", "/api/v1/memory"): "memory:write",
    ("GET", "/api/v1/memory"): "memory:read",
    ("GET", "/api/v1/memory/{memory_id}"): "memory:read",
    ("POST", "/api/v1/exceptions"): "exceptions:create",
    ("GET", "/api/v1/exceptions"): "exceptions:create",
    ("GET", "/api/v1/exceptions/{exception_id}"): "exceptions:create",
    ("POST", "/api/v1/exceptions/{exception_id}/transition"): "exceptions:transition",
    ("GET", "/api/v1/audit"): "audit:read",
    ("GET", "/api/v1/audit/{audit_id}"): "audit:read",
    ("GET", "/api/v1/agents"): "agents:read",
    ("GET", "/api/v1/agents/{agent_id}"): "agents:read",
    ("POST", "/api/v1/agents/{agent_id}/health-check"): "agents:execute",
    ("GET", "/api/v1/approvals"): "approvals:read",
    ("GET", "/api/v1/approvals/{approval_id}"): "approvals:read",
    ("GET", "/api/v1/categories"): "categories:read",
    ("GET", "/api/v1/categories/{category_id}"): "categories:read",
    ("POST", "/api/v1/categories/{category_id}/scan"): "categories:execute",
    ("POST", "/api/v1/commerce/write"): "commerce:write",
    ("GET", "/api/v1/integrations/status"): "integrations:read",
    ("POST", "/api/v1/integrations/suppliers/sync"): "integrations:execute",
    ("POST", "/api/v1/integrations/products/enrich"): "integrations:execute",
    ("POST", "/api/v1/integrations/webhooks/commerce"): "integrations:execute",
    ("GET", "/api/v1/reports/kurmay"): "reports:read",
    ("POST", "/api/v1/reports/kurmay"): "reports:create",
    ("GET", "/api/v1/reports/kurmay/{report_id}"): "reports:read",
    ("GET", "/api/v1/events"): "events:read",
    ("GET", "/api/v1/events/dead-letter"): "events:admin",
    ("GET", "/api/v1/events/{event_id}"): "events:read",
    ("POST", "/api/v1/events/{event_id}/replay"): "events:admin",
    ("GET", "/api/v1/suppliers"): "suppliers:read",
    ("POST", "/api/v1/suppliers"): "suppliers:write",
    ("GET", "/api/v1/suppliers/{id}"): "suppliers:read",
    ("POST", "/api/v1/suppliers/{id}/sync"): "suppliers:sync",
    ("GET", "/api/v1/products"): "products:read",
    ("GET", "/api/v1/products/{id}"): "products:read",
    ("POST", "/api/v1/products/{id}/enrich"): "products:enrich",
    ("POST", "/api/v1/pricing/evaluate"): "pricing:evaluate",
    ("POST", "/api/v1/pricing/publish"): "pricing:publish",
    ("GET", "/api/v1/pricing/candidates"): "pricing:read",
    ("GET", "/api/v1/stock"): "stock:read",
    ("POST", "/api/v1/stock/sync"): "stock:sync",
    ("GET", "/api/v1/orders"): "orders:read",
    ("GET", "/api/v1/orders/{id}"): "orders:read",
    ("POST", "/api/v1/orders/ingest"): "orders:ingest",
    ("POST", "/api/v1/returns/evaluate"): "returns:evaluate",
    ("GET", "/api/v1/returns"): "returns:read",
    ("GET", "/api/v1/returns/{id}"): "returns:read",
    ("GET", "/api/v1/analytics/kpis"): "analytics:read",
    ("GET", "/api/v1/analytics/workers"): "analytics:read",
    ("GET", "/api/v1/analytics/metrics"): "analytics:read",
    ("POST", "/api/v1/decisions/evaluate"): "decisions:execute",
    ("GET", "/api/v1/decisions"): "decisions:read",
    ("GET", "/api/v1/decisions/{id}"): "decisions:read",
}


def _normalize_path(path: str) -> str:
    if not path.startswith("/api/v1"):
        return path.rstrip("/") or path
    parts = path.rstrip("/").split("/")
    normalized: list[str] = []
    for part in parts:
        if part in {"api", "v1"} or not part:
            normalized.append(part)
            continue
        if part.startswith("{") or part in {"health", "ready"}:
            normalized.append(part)
            continue
        if len(part) == 36 and part.count("-") == 4:
            normalized.append("{id}")
            continue
        if part.replace(".", "").isdigit() or (part.startswith("bz.") or part.startswith("cat-")):
            normalized.append("{id}")
            continue
        normalized.append(part)
    return "/".join(normalized)


def required_permission(method: str, path: str) -> str | None:
    normalized = _normalize_path(path)
    for (route_method, route_path), permission in ENDPOINT_PERMISSIONS.items():
        if route_method != method.upper():
            continue
        if route_path == normalized:
            return permission
        route_parts = route_path.split("/")
        norm_parts = normalized.split("/")
        if len(route_parts) != len(norm_parts):
            continue
        if all(rp == np or rp.startswith("{") for rp, np in zip(route_parts, norm_parts)):
            return permission
    return None


def role_has_permission(role: str, permission: str) -> bool:
    perms = ROLE_PERMISSIONS.get(role.strip().lower(), frozenset())
    return permission in perms


def any_role_has_permission(roles: list[str], permission: str) -> bool:
    return any(role_has_permission(role, permission) for role in roles)
