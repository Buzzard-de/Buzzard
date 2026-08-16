"""Google Ads API — Markt-/Werbesignale für Intelligence-Scans."""

from __future__ import annotations

from typing import Any

DEFAULT_GAQL = """
SELECT
  campaign.id,
  campaign.name,
  campaign.status,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros
FROM campaign
WHERE segments.date DURING LAST_7_DAYS
  AND campaign.status != 'REMOVED'
LIMIT 20
""".strip()


def fetch_campaign_signals(client) -> dict[str, Any]:
    raw = client.query(DEFAULT_GAQL)
    campaigns = []
    total_impressions = 0
    total_clicks = 0
    total_cost_micros = 0

    for chunk in raw if isinstance(raw, list) else [raw]:
        for row in chunk.get("results", []):
            campaign = row.get("campaign", {})
            metrics = row.get("metrics", {})
            impressions = int(metrics.get("impressions") or 0)
            clicks = int(metrics.get("clicks") or 0)
            cost_micros = int(metrics.get("costMicros") or metrics.get("cost_micros") or 0)
            total_impressions += impressions
            total_clicks += clicks
            total_cost_micros += cost_micros
            campaigns.append(
                {
                    "campaign_id": campaign.get("id"),
                    "name": campaign.get("name"),
                    "status": campaign.get("status"),
                    "impressions": impressions,
                    "clicks": clicks,
                    "cost_eur": round(cost_micros / 1_000_000, 2),
                }
            )

    return {
        "quelle": "Google Ads API",
        "zeitraum": "LAST_7_DAYS",
        "kampagnen": campaigns,
        "summe": {
            "impressions": total_impressions,
            "clicks": total_clicks,
            "cost_eur": round(total_cost_micros / 1_000_000, 2),
        },
        "vertrauen": "Hoch",
    }


def fetch_google_ads_signals() -> dict[str, Any]:
    from live_connectors.google_ads import GoogleAdsClient

    client = GoogleAdsClient()
    if not client.configured():
        return {
            "status": "NOT_CONFIGURED",
            "quelle": "Google Ads API",
            "hinweis": "GOOGLE_ADS_* Variablen in intelligence/.env eintragen.",
        }
    try:
        signals = fetch_campaign_signals(client)
        signals["status"] = "OK"
        return signals
    except Exception as exc:  # noqa: BLE001
        return {
            "status": "FEHLER",
            "quelle": "Google Ads API",
            "fehler": str(exc),
        }
