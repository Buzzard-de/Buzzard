import urllib.parse, urllib.request, json

class HttpSearchProvider:
    """Adapter interface for a legal, permitted search provider.
    Provider endpoint and credentials are supplied via configuration."""
    def __init__(self, endpoint, api_key=None, timeout=15):
        self.endpoint, self.api_key, self.timeout = endpoint, api_key, timeout

    def search(self, query):
        params = urllib.parse.urlencode({"q": query})
        url = self.endpoint + ("&" if "?" in self.endpoint else "?") + params
        req = urllib.request.Request(url)
        if self.api_key:
            req.add_header("Authorization", f"Bearer {self.api_key}")
        with urllib.request.urlopen(req, timeout=self.timeout) as r:
            payload = r.read().decode("utf-8")
        data = json.loads(payload)
        return data.get("results", data if isinstance(data, list) else [])
