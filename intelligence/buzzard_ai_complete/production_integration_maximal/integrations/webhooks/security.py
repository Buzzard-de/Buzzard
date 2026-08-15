import hashlib
import hmac


def verify_hmac(secret, raw_body, supplied_signature):
    if not secret or not supplied_signature:
        return False
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, supplied_signature)
