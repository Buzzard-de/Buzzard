import os

import requests


class GoogleAdsClient:
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    API_ROOT = "https://googleads.googleapis.com"

    def __init__(self):
        self.developer_token = os.getenv("GOOGLE_ADS_DEVELOPER_TOKEN")
        self.client_id = os.getenv("GOOGLE_ADS_CLIENT_ID")
        self.client_secret = os.getenv("GOOGLE_ADS_CLIENT_SECRET")
        self.refresh_token = os.getenv("GOOGLE_ADS_REFRESH_TOKEN")
        self.customer_id = (os.getenv("GOOGLE_ADS_CUSTOMER_ID") or "").replace("-", "")
        self.login_customer_id = (
            os.getenv("GOOGLE_ADS_LOGIN_CUSTOMER_ID") or ""
        ).replace("-", "")

    def configured(self):
        return all(
            [
                self.developer_token,
                self.client_id,
                self.client_secret,
                self.refresh_token,
                self.customer_id,
            ]
        )

    def access_token(self):
        if not self.configured():
            raise RuntimeError("NOT_CONFIGURED: Google Ads credentials fehlen.")
        response = requests.post(
            self.TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "refresh_token": self.refresh_token,
            },
            timeout=30,
        )
        response.raise_for_status()
        return response.json()["access_token"]

    def query(self, gaql, version="v20"):
        token = self.access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "developer-token": self.developer_token,
            "Content-Type": "application/json",
        }
        if self.login_customer_id:
            headers["login-customer-id"] = self.login_customer_id
        url = (
            f"{self.API_ROOT}/{version}/customers/{self.customer_id}/googleAds:searchStream"
        )
        response = requests.post(url, headers=headers, json={"query": gaql}, timeout=60)
        response.raise_for_status()
        return response.json()
