import os

import requests


class AmazonCreatorsClient:
    TOKEN_URL = "https://api.amazon.co.uk/auth/o2/token"
    API = "https://creatorsapi.amazon"

    def __init__(self):
        self.client_id = os.getenv("AMAZON_CLIENT_ID")
        self.client_secret = os.getenv("AMAZON_CLIENT_SECRET")
        self.refresh_token = os.getenv("AMAZON_REFRESH_TOKEN")
        self.partner_tag = os.getenv("AMAZON_PARTNER_TAG")
        self.marketplace = os.getenv("AMAZON_MARKETPLACE", "www.amazon.de")

    def configured(self):
        return all(
            [
                self.client_id,
                self.client_secret,
                self.refresh_token,
                self.partner_tag,
            ]
        )

    def access_token(self):
        if not self.configured():
            raise RuntimeError("NOT_CONFIGURED: Amazon Creators API credentials fehlen.")
        response = requests.post(
            self.TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": self.refresh_token,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            },
            timeout=30,
        )
        response.raise_for_status()
        return response.json()["access_token"]

    def search(self, keywords):
        token = self.access_token()
        response = requests.post(
            f"{self.API}/catalog/v1/searchItems",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "x-marketplace": self.marketplace,
            },
            json={
                "keywords": keywords,
                "partnerTag": self.partner_tag,
                "marketplace": self.marketplace,
            },
            timeout=30,
        )
        response.raise_for_status()
        return response.json()
