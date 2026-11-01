import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from security.egress_policy import (  # noqa: E402
    EgressDenied,
    evaluate_egress,
    extra_hosts,
    is_private_or_local_host,
)
from security.guarded_fetch import guarded_get  # noqa: E402
from live_connectors.public_fetch import PublicFetcher  # noqa: E402
from live_connectors.ebay import EbayClient  # noqa: E402


class Egress44Python(unittest.TestCase):
    def tearDown(self):
        os.environ.pop("BUZZARD_EGRESS_EXTRA_HOSTS", None)
        os.environ.pop("HTTP_PROXY", None)

    def test_default_deny_and_ai_lock(self):
        self.assertFalse(evaluate_egress("https://api.openai.com/v1")["allowed"])
        self.assertEqual(evaluate_egress("https://api.anthropic.com/v1")["code"], "EXTERNAL_AI_EGRESS_DENIED")
        self.assertEqual(evaluate_egress("https://generativelanguage.googleapis.com/v1")["code"], "EXTERNAL_AI_EGRESS_DENIED")
        self.assertEqual(evaluate_egress("https://api.stripe.com/v1")["code"], "PAYMENT_EGRESS_LOCKED")

    def test_private_rebind_multicast(self):
        self.assertTrue(is_private_or_local_host("127.0.0.1.nip.io"))
        self.assertTrue(is_private_or_local_host("224.0.0.1"))
        self.assertTrue(is_private_or_local_host("169.254.169.254"))
        self.assertEqual(evaluate_egress("https://127.0.0.1.nip.io/")["code"], "PRIVATE_OR_IP_DENIED")

    def test_extra_hosts_cannot_unlock_ai(self):
        os.environ["BUZZARD_EGRESS_EXTRA_HOSTS"] = "*.openai.com,api.openai.com,api.ebay.com"
        os.environ["HTTP_PROXY"] = "http://127.0.0.1:8080"
        self.assertEqual(extra_hosts(), ["api.ebay.com"])
        self.assertFalse(evaluate_egress("https://api.openai.com/v1")["allowed"])

    def test_public_fetch_denied_without_allowlist(self):
        with self.assertRaises(EgressDenied) as ctx:
            PublicFetcher().fetch("https://example.com/")
        self.assertEqual(ctx.exception.code, "HOST_NOT_ALLOWLISTED")

    def test_ebay_token_denied_until_host_approved(self):
        os.environ["EBAY_CLIENT_ID"] = "id"
        os.environ["EBAY_CLIENT_SECRET"] = "secret"
        client = EbayClient()
        self.assertTrue(client.configured())
        with self.assertRaises(EgressDenied):
            client.token_for_app()

    def test_redirect_not_followed(self):
        class Fake:
            is_redirect = True
            status_code = 302
            headers = {"Location": "https://api.anthropic.com/v1"}

        with patch("security.guarded_fetch.resolve_and_check", return_value={"allowed": True, "code": "RESOLVED_OK", "host": "buzzard24.de"}):
            with patch("requests.Session.request", return_value=Fake()):
                with self.assertRaises(EgressDenied) as ctx:
                    guarded_get("https://buzzard24.de/out")
        self.assertEqual(ctx.exception.code, "REDIRECT_DENIED")


if __name__ == "__main__":
    unittest.main()
