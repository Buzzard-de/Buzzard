"""Buzzard Production Bridge MAX SINGLE — Preflight und Go-Live-Gate."""

from __future__ import annotations

import datetime
import hashlib
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_REPORT_PATH = REPO_ROOT / "data/taxonomy/buzzard_production_preflight.json"

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

ENV_ALIASES = {
    "APP_BASE_URL": ("APP_BASE_URL", "BUZZARD_SITE_URL", "PUBLIC_BASE_URL", "SITE_URL"),
    "DATABASE_URL": ("DATABASE_URL", "BUZZARD_DB_PATH"),
    "PAYMENT_PROVIDER": ("PAYMENT_PROVIDER", "DEFAULT_PAYMENT_PROVIDER"),
    "PAYMENT_PUBLIC_KEY": ("PAYMENT_PUBLIC_KEY", "STRIPE_PUBLISHABLE_KEY", "NEXT_PUBLIC_STRIPE_KEY"),
    "PAYMENT_SECRET_KEY": ("PAYMENT_SECRET_KEY", "STRIPE_SECRET_KEY", "PAYPAL_CLIENT_SECRET"),
    "SHIPPING_PROVIDER": ("SHIPPING_PROVIDER", "DEFAULT_CARRIER"),
    "SHIPPING_API_KEY": ("SHIPPING_API_KEY", "DHL_API_KEY", "CARRIER_API_KEY"),
    "SUPPLIER_API_BASE_URL": ("SUPPLIER_API_BASE_URL", "SUPPLIER_HUB_URL"),
    "SUPPLIER_API_KEY": ("SUPPLIER_API_KEY", "TECDOC_API_KEY"),
    "EMAIL_PROVIDER": ("EMAIL_PROVIDER", "SMTP_HOST"),
    "EMAIL_API_KEY": ("EMAIL_API_KEY", "SENDGRID_API_KEY", "MAILGUN_API_KEY"),
    "SESSION_SECRET": ("SESSION_SECRET", "JWT_SECRET"),
    "ENCRYPTION_KEY": ("ENCRYPTION_KEY", "JWT_SECRET"),
    "BACKUP_TARGET": ("BACKUP_TARGET", "BACKUP_BUCKET", "BACKUP_S3_URL", "BUZZARD_BACKUP_ENABLED"),
    "ANALYTICS_ID": ("ANALYTICS_ID", "SENTRY_DSN", "MONITORING_URL", "OTEL_EXPORTER_OTLP_ENDPOINT"),
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
    ("DOMAIN", "Produktions-Domain konfiguriert"),
    ("TLS", "HTTPS/TLS aktiviert"),
    ("DATABASE", "Produktions-Datenbank konfiguriert"),
    ("PAYMENT", "Zahlungsanbieter konfiguriert"),
    ("SHIPPING", "Versand-/Carrier-Anbieter konfiguriert"),
    ("SUPPLIER", "Lieferanten-/API-Integration konfiguriert"),
    ("EMAIL", "Transaktions-E-Mail konfiguriert"),
    ("SECURITY", "Session-/Verschlüsselungs-Secrets konfiguriert"),
    ("BACKUP", "Produktions-Backup-Ziel konfiguriert"),
    ("MONITORING", "Monitoring/Logging konfiguriert"),
    ("LEGAL", "Erforderliche Rechtsseiten erreichbar"),
    ("ORDER_TEST", "Test-Bestellablauf bestanden"),
    ("RETURN_TEST", "Retoure/Widerruf-Ablauf bestanden"),
    ("GDPR", "Consent/Datenschutz-Konfiguration bestanden"),
]


def present(value: str | None) -> bool:
    return bool(value and str(value).strip())


def env_value(key: str) -> str:
    for name in ENV_ALIASES.get(key, (key,)):
        value = os.getenv(name, "").strip()
        if value:
            return value
    return ""


class ProductionBridgePreflight:
    def check_env(self) -> list[dict]:
        results = []
        for key, _default in REQUIRED_ENV.items():
            if key == "APP_ENV":
                current = os.getenv("APP_ENV", os.getenv("NODE_ENV", "development"))
                ok = current == "production"
                detail = current or "development"
            else:
                value = env_value(key)
                ok = present(value)
                detail = "konfiguriert" if ok else "fehlt"
            results.append({"gate": key, "ok": ok, "detail": detail})
        return results

    def check_url(self, url: str, timeout: int = 8) -> tuple[bool, str]:
        if not present(url):
            return False, "URL fehlt"
        try:
            request = urllib.request.Request(
                url,
                method="GET",
                headers={"User-Agent": "Buzzard-Production-Preflight/1.0"},
            )
            with urllib.request.urlopen(request, timeout=timeout) as response:
                status = getattr(response, "status", 200)
                return 200 <= status < 500, f"HTTP {status}"
        except urllib.error.HTTPError as exc:
            return 200 <= exc.code < 500, f"HTTP {exc.code}"
        except Exception as exc:
            return False, str(exc)

    def check_legal_routes(self, base_url: str, check_urls: bool = True) -> list[dict]:
        base = base_url.rstrip("/")
        rows = []
        for route in REQUIRED_LEGAL_ROUTES:
            if not base:
                rows.append({"route": route, "ok": False, "detail": "APP_BASE_URL fehlt"})
                continue
            if not check_urls:
                rows.append({"route": route, "ok": False, "detail": "URL-Prüfung deaktiviert"})
                continue
            ok, detail = self.check_url(base + route)
            rows.append({"route": route, "ok": ok, "detail": detail})
        return rows

    @staticmethod
    def sha256_file(path: str | Path) -> str | None:
        target = Path(path)
        if not target.is_file():
            return None
        return hashlib.sha256(target.read_bytes()).hexdigest()

    def run_preflight(self, check_legal_urls: bool = True) -> dict:
        env_checks = self.check_env()
        base = env_value("APP_BASE_URL")
        site_ok, site_detail = self.check_url(base) if base else (False, "APP_BASE_URL fehlt")
        legal = self.check_legal_routes(base, check_urls=check_legal_urls)

        gates = {
            "DOMAIN": present(base),
            "TLS": base.startswith("https://"),
            "DATABASE": present(env_value("DATABASE_URL")) or os.getenv("BUZZARD_DB_ENABLED") == "1",
            "PAYMENT": all(present(env_value(key)) for key in ("PAYMENT_PROVIDER", "PAYMENT_PUBLIC_KEY", "PAYMENT_SECRET_KEY")),
            "SHIPPING": all(present(env_value(key)) for key in ("SHIPPING_PROVIDER", "SHIPPING_API_KEY")),
            "SUPPLIER": all(present(env_value(key)) for key in ("SUPPLIER_API_BASE_URL", "SUPPLIER_API_KEY")),
            "EMAIL": all(present(env_value(key)) for key in ("EMAIL_PROVIDER", "EMAIL_API_KEY")),
            "SECURITY": all(present(env_value(key)) for key in ("SESSION_SECRET", "ENCRYPTION_KEY")),
            "BACKUP": present(env_value("BACKUP_TARGET")),
            "MONITORING": present(env_value("ANALYTICS_ID")),
            "LEGAL": bool(legal) and all(item["ok"] for item in legal) if check_legal_urls else present(
                os.getenv("BUZZARD_LEGAL_READY")
            ),
            "ORDER_TEST": os.getenv("BUZZARD_ORDER_TEST_PASSED") == "1",
            "RETURN_TEST": os.getenv("BUZZARD_RETURN_TEST_PASSED") == "1",
            "GDPR": os.getenv("BUZZARD_GDPR_READY") == "1",
        }

        passed = sum(1 for value in gates.values() if value)
        total = len(gates)
        return {
            "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "site": {"ok": site_ok, "detail": site_detail, "url": base or None},
            "gates": gates,
            "gate_labels": {name: label for name, label in PRODUCTION_GATES},
            "passed": passed,
            "total": total,
            "readiness_pct": round(100 * passed / total, 1) if total else 0,
            "legal_routes": legal,
            "environment": env_checks,
            "go_live_allowed": all(gates.values()),
            "rule": "Kein Produktions-Go-Live, bis jedes Gate explizit bestanden ist.",
        }

    def save_report(self, path: str | Path | None = None) -> dict:
        report = self.run_preflight(check_legal_urls=False)
        target = Path(path or DEFAULT_REPORT_PATH)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        public = REPO_ROOT / "public/taxonomy/buzzard_production_preflight.json"
        public.parent.mkdir(parents=True, exist_ok=True)
        public.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        report["report_path"] = str(target)
        try:
            report["report_path"] = str(target.relative_to(REPO_ROOT))
        except ValueError:
            report["report_path"] = str(target)
        return report
