"""Zentraler Live-Connector-Hub für Buzzard Intelligence."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable


@dataclass
class ConnectorSpec:
    name: str
    key: str
    beschreibung: str
    env_vars: tuple[str, ...]
    immer_bereit: bool = False


CONNECTORS: tuple[ConnectorSpec, ...] = (
    ConnectorSpec(
        name="eBay Browse API",
        key="ebay",
        beschreibung="Marketplace-Preise und Listings (EBAY_DE)",
        env_vars=("EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET"),
    ),
    ConnectorSpec(
        name="Amazon Creators API",
        key="amazon",
        beschreibung="Produkt- und Angebotsrecherche auf amazon.de",
        env_vars=(
            "AMAZON_CLIENT_ID",
            "AMAZON_CLIENT_SECRET",
            "AMAZON_REFRESH_TOKEN",
            "AMAZON_PARTNER_TAG",
        ),
    ),
    ConnectorSpec(
        name="Google Ads API",
        key="google_ads",
        beschreibung="Eigene Werbe- und Suchperformance",
        env_vars=(
            "GOOGLE_ADS_DEVELOPER_TOKEN",
            "GOOGLE_ADS_CLIENT_ID",
            "GOOGLE_ADS_CLIENT_SECRET",
            "GOOGLE_ADS_REFRESH_TOKEN",
            "GOOGLE_ADS_CUSTOMER_ID",
        ),
    ),
    ConnectorSpec(
        name="Public URL Fetcher",
        key="public_fetch",
        beschreibung="Autorisierte öffentliche Webseiten abrufen",
        env_vars=(),
        immer_bereit=True,
    ),
)


def _client_status(key: str) -> dict[str, Any]:
    if key == "ebay":
        from live_connectors.ebay import EbayClient

        client = EbayClient()
        return {"configured": client.configured(), "marketplace": client.marketplace}
    if key == "amazon":
        from live_connectors.amazon_creators import AmazonCreatorsClient

        client = AmazonCreatorsClient()
        return {
            "configured": client.configured(),
            "marketplace": client.marketplace,
            "partner_tag": bool(client.partner_tag),
        }
    if key == "google_ads":
        from live_connectors.google_ads import GoogleAdsClient

        client = GoogleAdsClient()
        return {
            "configured": client.configured(),
            "customer_id": client.customer_id or None,
        }
    if key == "public_fetch":
        return {"configured": True}
    return {"configured": False}


def connector_health() -> dict[str, Any]:
    rows = []
    ready = 0
    for spec in CONNECTORS:
        detail = _client_status(spec.key)
        configured = spec.immer_bereit or detail.get("configured", False)
        status = "READY" if configured else "NOT_CONFIGURED"
        if configured:
            ready += 1
        rows.append(
            {
                "key": spec.key,
                "name": spec.name,
                "beschreibung": spec.beschreibung,
                "status": status,
                "env_vars": list(spec.env_vars),
                "detail": detail,
            }
        )
    return {
        "service": "buzzard-live-connectors",
        "connectors": rows,
        "connector_count": len(rows),
        "ready_count": ready,
        "not_configured_count": len(rows) - ready,
    }


def connector_health_text() -> str:
    payload = connector_health()
    lines = ["=== BUZZARD LIVE CONNECTORS ===", ""]
    for row in payload["connectors"]:
        lines.append(f"{row['name']}: {row['status']}")
    lines.append("")
    lines.append(
        f"Bereit: {payload['ready_count']}/{payload['connector_count']} "
        f"(Credentials in intelligence/.env eintragen)"
    )
    return "\n".join(lines)
