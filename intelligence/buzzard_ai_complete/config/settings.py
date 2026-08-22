import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_DEFAULT_DB = ROOT / "database" / "buzzard_complete.db"
DB_PATH = Path(os.getenv("BUZZARD_COMPLETE_DB", os.getenv("BUZZARD_DB", str(_DEFAULT_DB))))
LOG_DIR = ROOT / "logs"
DATA_DIR = ROOT / "data"
LOG_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

APP_NAME = "Buzzard AI COMPLETE"
APP_VERSION = "2.2.0"
API_TOKEN = os.getenv("BUZZARD_API_TOKEN", os.getenv("API_TOKEN", ""))
MAX_FETCH_BYTES = int(os.getenv("BUZZARD_MAX_FETCH_BYTES", "2000000"))
REQUEST_TIMEOUT = int(os.getenv("BUZZARD_REQUEST_TIMEOUT", "15"))
APP_ENV = os.getenv("APP_ENV", "development")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "")
LLM_API_BASE = os.getenv("LLM_API_BASE", "https://api.openai.com/v1").rstrip("/")
COMMERCE_API_URL = os.getenv("COMMERCE_API_URL", "").rstrip("/")
COMMERCE_API_TOKEN = os.getenv("COMMERCE_API_TOKEN", "")
SEARCH_ENDPOINT = os.getenv("SEARCH_ENDPOINT", "")
SEARCH_API_KEY = os.getenv("SEARCH_API_KEY", "")

# Phase 2 AI Core
BUZZARD_AI_CORE_V2 = os.getenv("BUZZARD_AI_CORE_V2", "false").lower() in {"1", "true", "yes", "on"}
_DEFAULT_TAXONOMY = ROOT / "master_taxonomy_48_maximal" / "data" / "taxonomy.json"
BUZZARD_MASTER_TAXONOMY_PATH = Path(
    os.getenv("BUZZARD_MASTER_TAXONOMY_PATH", str(_DEFAULT_TAXONOMY))
)
APPROVER_ROLES = frozenset(
    r.strip().lower()
    for r in os.getenv("BUZZARD_APPROVER_ROLES", "admin,operator,approver").split(",")
    if r.strip()
)
DEFAULT_API_ROLE = os.getenv("BUZZARD_DEFAULT_API_ROLE", "api-user").strip().lower()
ALLOW_ROLE_HEADER = os.getenv("BUZZARD_ALLOW_ROLE_HEADER", "false").lower() in {"1", "true", "yes", "on"}

# Phase 3 AI Core Wave 1
BUZZARD_AI_CORE_V3 = os.getenv("BUZZARD_AI_CORE_V3", "false").lower() in {"1", "true", "yes", "on"}
BUZZARD_JWT_ENABLED = os.getenv("BUZZARD_JWT_ENABLED", "false").lower() in {"1", "true", "yes", "on"}
BUZZARD_API_PERMISSIONS_ENABLED = os.getenv(
    "BUZZARD_API_PERMISSIONS_ENABLED",
    "true" if BUZZARD_AI_CORE_V3 else "false",
).lower() in {"1", "true", "yes", "on"}
BUZZARD_JWT_ISSUER = os.getenv("BUZZARD_JWT_ISSUER", "buzzard-ai-core")
BUZZARD_JWT_AUDIENCE = os.getenv("BUZZARD_JWT_AUDIENCE", "buzzard-api")
BUZZARD_JWT_ALGORITHM = os.getenv("BUZZARD_JWT_ALGORITHM", "RS256")
BUZZARD_JWT_PUBLIC_KEY = os.getenv("BUZZARD_JWT_PUBLIC_KEY", "")
BUZZARD_JWT_PRIVATE_KEY = os.getenv("BUZZARD_JWT_PRIVATE_KEY", "")
BUZZARD_JWT_HS_SECRET = os.getenv("BUZZARD_JWT_HS_SECRET", "")
COMMERCE_WEBHOOK_SECRET = os.getenv("COMMERCE_WEBHOOK_SECRET", "")
IDEMPOTENCY_TTL_SECONDS = int(os.getenv("BUZZARD_IDEMPOTENCY_TTL_SECONDS", "86400"))
EVENT_MAX_RETRIES = int(os.getenv("BUZZARD_EVENT_MAX_RETRIES", "5"))

# Phase 3 AI Core Wave 2 — Supplier + Product Pipeline
SUPPLIER_FEEDS_URL = os.getenv("SUPPLIER_FEEDS_URL", "").rstrip("/")
SUPPLIER_FEEDS_TOKEN = os.getenv("SUPPLIER_FEEDS_TOKEN", "")
SUPPLIER_FEED_TYPE = os.getenv("SUPPLIER_FEED_TYPE", "rest")
SUPPLIER_FEED_PATH = os.getenv("SUPPLIER_FEED_PATH", "")
SUPPLIER_IMPORT_MAX_BYTES = int(os.getenv("SUPPLIER_IMPORT_MAX_BYTES", "5242880"))
SUPPLIER_CREDENTIALS_KEY = os.getenv("SUPPLIER_CREDENTIALS_KEY", "")

# Phase 3 AI Core Wave 3 — Pricing, Stock, Order Intelligence
WMS_API_URL = os.getenv("WMS_API_URL", "").rstrip("/")
WMS_API_TOKEN = os.getenv("WMS_API_TOKEN", "")
CRM_API_URL = os.getenv("CRM_API_URL", "").rstrip("/")
CRM_API_TOKEN = os.getenv("CRM_API_TOKEN", "")
PRICING_MIN_MARGIN = float(os.getenv("PRICING_MIN_MARGIN", "0.15"))
PRICING_MAX_DISCOUNT = float(os.getenv("PRICING_MAX_DISCOUNT", "0.25"))
PRICING_AUTO_APPROVE_MARGIN_BUFFER = float(os.getenv("PRICING_AUTO_APPROVE_MARGIN_BUFFER", "0.05"))
PROCUREMENT_PO_APPROVAL_THRESHOLD = float(os.getenv("PROCUREMENT_PO_APPROVAL_THRESHOLD", "5000"))
ORDER_WEBHOOK_SECRET = os.getenv("ORDER_WEBHOOK_SECRET", "")

# Phase 3 AI Core Wave 4 — Logistics, Returns, Market, Observability
DHL_API_URL = os.getenv("DHL_API_URL", "").rstrip("/")
DHL_API_KEY = os.getenv("DHL_API_KEY", "")
DHL_API_SECRET = os.getenv("DHL_API_SECRET", "")
DHL_USE_MOCK = os.getenv("DHL_USE_MOCK", "true").lower() in {"1", "true", "yes", "on"}
CARRIER_WEBHOOK_SECRET = os.getenv("CARRIER_WEBHOOK_SECRET", "")
LOGISTICS_LABEL_APPROVAL_THRESHOLD = float(os.getenv("LOGISTICS_LABEL_APPROVAL_THRESHOLD", "100"))
MARKET_DATA_ALLOWED_SOURCES = frozenset(
    s.strip().lower()
    for s in os.getenv(
        "MARKET_DATA_ALLOWED_SOURCES",
        "internal_commerce,google_trends,licensed_feed,official_statistics",
    ).split(",")
    if s.strip()
)
BUZZARD_OBSERVABILITY_ENABLED = os.getenv("BUZZARD_OBSERVABILITY_ENABLED", "true").lower() in {"1", "true", "yes", "on"}
BUZZARD_AUTONOMY_DISABLED = os.getenv("BUZZARD_AUTONOMY_DISABLED", "false").lower() in {"1", "true", "yes", "on"}

# Phase 3 AI Core Wave 5 — Decision Engine + Autonomous L4 + Procurement Worker
BUZZARD_AUTONOMY_L4_ENABLED = os.getenv("BUZZARD_AUTONOMY_L4_ENABLED", "false").lower() in {"1", "true", "yes", "on"}
BUZZARD_PO_AUTO_THRESHOLD_EUR = float(os.getenv("BUZZARD_PO_AUTO_THRESHOLD_EUR", "500"))
BUZZARD_COMMERCE_WRITES_DISABLED = os.getenv("BUZZARD_COMMERCE_WRITES_DISABLED", "false").lower() in {"1", "true", "yes", "on"}


def _parse_token_roles(raw: str) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for part in raw.split(","):
        piece = part.strip()
        if not piece or ":" not in piece:
            continue
        token, role = piece.split(":", 1)
        token = token.strip()
        role = role.strip().lower()
        if token and role:
            mapping[token] = role
    return mapping


API_TOKEN_ROLES = _parse_token_roles(os.getenv("BUZZARD_API_TOKEN_ROLES", ""))
RATE_LIMIT_PER_MINUTE = int(os.getenv("BUZZARD_RATE_LIMIT_PER_MINUTE", "60"))
BUZZARD_WORKER_POLL_INTERVAL_SECONDS = int(os.getenv("BUZZARD_WORKER_POLL_INTERVAL_SECONDS", "30"))
