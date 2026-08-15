import hashlib, hmac
from buzzard_ai_complete.config.settings import API_TOKEN
def authorize(token):
    if not API_TOKEN:return True
    return bool(token) and hmac.compare_digest(hashlib.sha256(token.encode()).hexdigest(),hashlib.sha256(API_TOKEN.encode()).hexdigest())
