import json
import sys
import urllib.parse
from pathlib import Path

def _guarded_urlopen(url: str, timeout: int, headers: dict):
    root = next((p for p in Path(__file__).resolve().parents if (p / "security" / "guarded_fetch.py").exists()), None)
    if root and str(root) not in sys.path:
        sys.path.insert(0, str(root))
    from security.guarded_fetch import guarded_urlopen  # noqa: WPS433
    return guarded_urlopen(url, timeout=timeout, headers=headers)

class HttpSearchProvider:
    """Adapter interface for a legal, permitted search provider.
    Provider endpoint and credentials are supplied via configuration."""
    def __init__(self, endpoint, api_key=None, timeout=15):
        self.endpoint, self.api_key, self.timeout = endpoint, api_key, timeout

    def search(self, query):
        params = urllib.parse.urlencode({"q": query})
        url = self.endpoint + ("&" if "?" in self.endpoint else "?") + params
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        with _guarded_urlopen(url, self.timeout, headers) as r:
            payload = r.read().decode("utf-8")
        data = json.loads(payload)
        return data.get("results", data if isinstance(data, list) else [])
