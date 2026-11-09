import hashlib
import os
from datetime import datetime, timezone
from urllib.parse import urlparse

from security.guarded_fetch import guarded_get


class PublicFetcher:
    def __init__(self):
        self.ua = os.getenv("BUZZARD_USER_AGENT", "Buzzard-Intelligence/1.0")

    def fetch(self, url):
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            raise ValueError("Nur http/https.")
        response = guarded_get(
            url,
            headers={"User-Agent": self.ua},
            timeout=30,
            classification="public",
        )
        response.raise_for_status()
        raw = response.content
        return {
            "url": response.url,
            "status_code": response.status_code,
            "content_type": response.headers.get("content-type", ""),
            "observed_at": datetime.now(timezone.utc).isoformat(),
            "sha256": hashlib.sha256(raw).hexdigest(),
            "bytes": len(raw),
            "text": raw.decode(response.encoding or "utf-8", errors="replace"),
        }
