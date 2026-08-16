"""
BUZZARD PRODUCTION BRIDGE — SINGLE FILE / GO-LIVE GATE
======================================================

Purpose:
Turn the completed Buzzard software architecture into a controlled
production-readiness gate. It does NOT fabricate credentials or pretend
third-party services are connected.

The bridge checks:
- production environment
- database
- storefront URL
- payment provider configuration
- shipping provider configuration
- supplier/API configuration
- email
- analytics
- legal pages
- security secrets
- backup
- monitoring
- order lifecycle
- return/widerruf flow
- GDPR/consent configuration

All integrations are adapter-based and environment-driven.
"""

import os, json, hashlib, datetime, urllib.request
from pathlib import Path

REQUIRED_ENV = {
    "APP_ENV": "production",
    "APP_BASE_URL": "",
    "DATABASE_URL": "",
    "PAYMENT_PROVIDER": "",
    "PAYMENT_PUBLIC_KEY": "",
    "PAYMENT_SECRET_KEY": "",
    "SHIPPING_PROVIDER": "",
    "SHIPPING_API_KEY": "",
    "SUPPLIER_API_BASE_URL": "",
    "SUPPLIER_API_KEY": "",
    "EMAIL_PROVIDER": "",
    "EMAIL_API_KEY": "",
    "SESSION_SECRET": "",
    "ENCRYPTION_KEY": "",
    "BACKUP_TARGET": "",
    "ANALYTICS_ID": "",
}

REQUIRED_LEGAL_ROUTES = [
    "/impressum",
    "/datenschutz",
    "/agb",
    "/widerruf",
    "/versand",
    "/zahlung",
    "/kontakt",
]

PRODUCTION_GATES = [
    ("DOMAIN", "Production domain configured"),
    ("TLS", "HTTPS/TLS enabled"),
    ("DATABASE", "Production database configured"),
    ("PAYMENT", "Payment provider configured"),
    ("SHIPPING", "Shipping/carrier provider configured"),
    ("SUPPLIER", "Supplier/API integration configured"),
    ("EMAIL", "Transactional email configured"),
    ("SECURITY", "Session/encryption secrets configured"),
    ("BACKUP", "Production backup target configured"),
    ("MONITORING", "Monitoring/logging configured"),
    ("LEGAL", "Required legal routes configured"),
    ("ORDER_TEST", "Test order lifecycle passed"),
    ("RETURN_TEST", "Return/Widerruf lifecycle passed"),
    ("GDPR", "Consent/privacy configuration passed"),
]

def present(v):
    return bool(v and str(v).strip())

def check_env():
    results = []
    for key, default in REQUIRED_ENV.items():
        if key == "APP_ENV":
            ok = os.getenv(key, "development") == "production"
        else:
            ok = present(os.getenv(key, ""))
        results.append({
            "gate": key,
            "ok": ok,
            "detail": "configured" if ok else "missing"
        })
    return results

def check_url(url, timeout=8):
    if not present(url):
        return False, "URL missing"
    try:
        req = urllib.request.Request(url, method="GET",
                                     headers={"User-Agent":"Buzzard-Production-Preflight/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return 200 <= r.status < 500, f"HTTP {r.status}"
    except Exception as e:
        return False, str(e)

def check_legal_routes():
    base = os.getenv("APP_BASE_URL","").rstrip("/")
    out=[]
    for route in REQUIRED_LEGAL_ROUTES:
        ok, detail = check_url(base + route) if base else (False, "APP_BASE_URL missing")
        out.append({"route":route,"ok":ok,"detail":detail})
    return out

def sha256_file(path):
    p=Path(path)
    if not p.exists():
        return None
    return hashlib.sha256(p.read_bytes()).hexdigest()

def run_preflight():
    env=check_env()
    base=os.getenv("APP_BASE_URL","").rstrip("/")
    site_ok,site_detail=check_url(base) if base else (False,"APP_BASE_URL missing")
    legal=check_legal_routes()

    gates = {
        "DOMAIN": present(base),
        "TLS": base.startswith("https://"),
        "DATABASE": present(os.getenv("DATABASE_URL")),
        "PAYMENT": all(present(os.getenv(k)) for k in
                       ("PAYMENT_PROVIDER","PAYMENT_PUBLIC_KEY","PAYMENT_SECRET_KEY")),
        "SHIPPING": all(present(os.getenv(k)) for k in
                        ("SHIPPING_PROVIDER","SHIPPING_API_KEY")),
        "SUPPLIER": all(present(os.getenv(k)) for k in
                        ("SUPPLIER_API_BASE_URL","SUPPLIER_API_KEY")),
        "EMAIL": all(present(os.getenv(k)) for k in
                     ("EMAIL_PROVIDER","EMAIL_API_KEY")),
        "SECURITY": all(present(os.getenv(k)) for k in
                        ("SESSION_SECRET","ENCRYPTION_KEY")),
        "BACKUP": present(os.getenv("BACKUP_TARGET")),
        "MONITORING": present(os.getenv("ANALYTICS_ID")),
        "LEGAL": bool(legal) and all(x["ok"] for x in legal),
        # These are intentionally explicit operational gates. They must be
        # changed to True only after real end-to-end tests have been executed.
        "ORDER_TEST": False,
        "RETURN_TEST": False,
        "GDPR": False,
    }

    passed=sum(gates.values())
    total=len(gates)
    report={
        "generated_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "site":{"ok":site_ok,"detail":site_detail},
        "gates":gates,
        "passed":passed,
        "total":total,
        "readiness_pct":round(100*passed/total,1),
        "legal_routes":legal,
        "environment":env,
        "go_live_allowed": all(gates.values()),
        "rule":"No production go-live until every gate is explicitly passed."
    }
    return report

def save_report(path="buzzard_production_preflight.json"):
    report=run_preflight()
    Path(path).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    return report

if __name__=="__main__":
    report=save_report()
    print(json.dumps(report,ensure_ascii=False,indent=2))
