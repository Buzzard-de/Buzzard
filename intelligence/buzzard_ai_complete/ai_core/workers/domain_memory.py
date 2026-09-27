from __future__ import annotations

from typing import Any

from buzzard_ai_complete.ai_core.enums import MemoryImpact, MemoryType


def domain_memory_entry(
    namespace: str,
    key: str,
    content: dict[str, Any],
    *,
    impact: str = MemoryImpact.LOW.value,
) -> dict[str, Any]:
    """Build a structured memory entry for domain worker namespaces."""
    domain = namespace.split("/", 1)[0]
    return {
        "namespace": namespace,
        "key": key,
        "type": MemoryType.SIGNAL.value,
        "category": domain,
        "content": content,
        "impact": impact,
    }
