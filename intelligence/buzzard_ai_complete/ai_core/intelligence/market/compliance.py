from __future__ import annotations

from typing import Any

from buzzard_ai_complete.config import settings


class MarketSourceValidator:
    """Validate market data sources against compliant whitelist."""

    def __init__(self, allowed_sources: frozenset[str] | None = None) -> None:
        self._allowed = allowed_sources or settings.MARKET_DATA_ALLOWED_SOURCES

    def is_allowed(self, source: str) -> bool:
        normalized = source.strip().lower()
        if not normalized:
            return False
        if normalized in {"scraper", "unauthorized", "raw_html"}:
            return False
        return normalized in self._allowed

    def validate_payload(self, payload: dict[str, Any]) -> tuple[bool, list[str]]:
        source = str(payload.get("source", "")).strip()
        errors: list[str] = []
        if not source:
            errors.append("source is required")
        elif not self.is_allowed(source):
            errors.append(f"source {source!r} is not in compliant whitelist")
        if payload.get("scraped") is True:
            errors.append("scraped data is prohibited")
        return not errors, errors
