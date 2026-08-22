from __future__ import annotations

import re

_LEGACY_CAT = re.compile(r"^cat[-_]?(\d+)$", re.IGNORECASE)
_LEGACY_CATEGORY = re.compile(r"^category[-_]?(\d+)$", re.IGNORECASE)
_LEGACY_C = re.compile(r"^c(\d+)$", re.IGNORECASE)


def resolve_legacy_category_id(legacy_id: str) -> str | None:
    """Resolve legacy cat-XX / CATEGORY_XX / C01 identifiers to bz.XX taxonomy ids."""
    raw = legacy_id.strip()
    if raw.startswith("bz."):
        return raw

    for pattern in (_LEGACY_CAT, _LEGACY_CATEGORY, _LEGACY_C):
        match = pattern.match(raw)
        if match:
            return f"bz.{match.group(1).zfill(2)}"
    return None
