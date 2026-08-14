import base64
import os

import requests


class EbayClient:
    TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token"
    API = "https://api.ebay.com"

    def __init__(self):
        self.client_id = os.getenv("EBAY_CLIENT_ID")
        self.client_secret = os.getenv("EBAY_CLIENT_SECRET")
        self.marketplace = os.getenv("EBAY_MARKETPLACE_ID", "EBAY_DE")
        self.token = None

    def configured(self):
        return bool(self.client_id and self.client_secret)

    def token_for_app(self):
        if not self.configured():
            raise RuntimeError("NOT_CONFIGURED: EBAY_CLIENT_ID/SECRET fehlen.")
        raw = f"{self.client_id}:{self.client_secret}".encode()
        auth = base64.b64encode(raw).decode()
        response = requests.post(
            self.TOKEN_URL,
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={
                "grant_type": "client_credentials",
                "scope": "https://api.ebay.com/oauth/api_scope",
            },
            timeout=30,
        )
        response.raise_for_status()
        self.token = response.json()["access_token"]
        return self.token

    def search(self, query, limit=20):
        token = self.token_for_app()
        response = requests.get(
            f"{self.API}/buy/browse/v1/item_summary/search",
            headers={
                "Authorization": f"Bearer {token}",
                "X-EBAY-C-MARKETPLACE-ID": self.marketplace,
            },
            params={"q": query, "limit": min(max(limit, 1), 200)},
            timeout=30,
        )
        response.raise_for_status()
        return response.json()
