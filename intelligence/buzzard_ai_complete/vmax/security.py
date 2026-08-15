import hashlib
import hmac


class SecretFingerprint:
    @staticmethod
    def fingerprint(value):
        if not value:
            return ""
        return hashlib.sha256(value.encode()).hexdigest()


class WebhookVerifier:
    @staticmethod
    def verify(payload, signature, secret):
        if not secret or not signature:
            return False
        digest = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(digest, signature)
