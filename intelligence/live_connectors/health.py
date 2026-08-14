import os

from .amazon_creators import AmazonCreatorsClient
from .ebay import EbayClient
from .google_ads import GoogleAdsClient


def live_health_report():
    checks = {
        "eBay": EbayClient().configured(),
        "Amazon Creators": AmazonCreatorsClient().configured(),
        "Google Ads": GoogleAdsClient().configured(),
    }
    lines = []
    for name, ok in checks.items():
        status = "READY" if ok else "NOT_CONFIGURED"
        lines.append(f"{name}: {status}")
    lines.append("Public URL Fetcher: READY")
    return "\n".join(lines)
