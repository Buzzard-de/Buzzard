"""Buzzard Production Bridge — Manifest und Go-Live-Gates."""

from __future__ import annotations

import json
import os
from pathlib import Path

from buzzard_ai_complete.production.preflight import ProductionBridgePreflight

REPO_ROOT = Path(__file__).resolve().parents[3]
MANIFEST_PATH = REPO_ROOT / "data/taxonomy/buzzard_production_bridge_manifest.json"

GATE_LABELS_DE = {
    "domain": "Domain",
    "TLS": "TLS/HTTPS",
    "database": "Datenbank",
    "payment": "Zahlung",
    "shipping": "Versand",
    "supplier/API": "Lieferant/API",
    "email": "E-Mail",
    "security": "Sicherheit",
    "backup": "Backup",
    "monitoring": "Monitoring",
    "legal": "Rechtliches",
    "end-to-end order": "End-to-End-Bestellung",
    "return/Widerruf": "Retoure/Widerruf",
    "GDPR/consent": "DSGVO/Einwilligung",
}


def _env(*names: str) -> str:
    for name in names:
        value = os.getenv(name, "").strip()
        if value:
            return value
    return ""


def _configured(*names: str) -> bool:
    return bool(_env(*names))


class ProductionBridgeService:
    def __init__(self):
        self._preflight = ProductionBridgePreflight()

    def manifest_path(self) -> Path:
        return MANIFEST_PATH

    def load_manifest(self) -> dict:
        return json.loads(self.manifest_path().read_text(encoding="utf-8"))

    def _gate_domain(self) -> dict:
        site = _env("BUZZARD_SITE_URL", "PUBLIC_BASE_URL", "SITE_URL")
        ok = bool(site) and "localhost" not in site and "127.0.0.1" not in site
        return {
            "gate": "domain",
            "label": GATE_LABELS_DE["domain"],
            "status": "PASS" if ok else "BLOCKED",
            "blocking": not ok,
            "detail": site or "Keine Produktions-Domain konfiguriert",
        }

    def _gate_tls(self) -> dict:
        site = _env("BUZZARD_SITE_URL", "PUBLIC_BASE_URL", "SITE_URL")
        ok = site.startswith("https://")
        return {
            "gate": "TLS",
            "label": GATE_LABELS_DE["TLS"],
            "status": "PASS" if ok else "BLOCKED",
            "blocking": not ok,
            "detail": "HTTPS erforderlich" if not ok else site,
        }

    def _gate_database(self) -> dict:
        ok = _configured("DATABASE_URL", "BUZZARD_DB_PATH") or os.getenv("BUZZARD_DB_ENABLED") == "1"
        return {
            "gate": "database",
            "label": GATE_LABELS_DE["database"],
            "status": "PASS" if ok else "BLOCKED",
            "blocking": not ok,
            "detail": "Datenbankpfad oder DATABASE_URL konfiguriert" if ok else "Keine Datenbank konfiguriert",
        }

    def _gate_payment(self) -> dict:
        ok = _configured("STRIPE_SECRET_KEY", "PAYPAL_CLIENT_ID", "PAYMENT_PROVIDER_KEY")
        return {
            "gate": "payment",
            "label": GATE_LABELS_DE["payment"],
            "status": "PASS" if ok else "BLOCKED",
            "blocking": not ok,
            "detail": "Zahlungsanbieter konfiguriert" if ok else "Keine Zahlungs-Credentials",
        }

    def _gate_shipping(self) -> dict:
        ok = _configured("DHL_API_KEY", "DPD_API_KEY", "CARRIER_API_KEY", "SHIPPING_API_KEY")
        return {
            "gate": "shipping",
            "label": GATE_LABELS_DE["shipping"],
            "status": "PASS" if ok else "BLOCKED",
            "blocking": not ok,
            "detail": "Versand-API konfiguriert" if ok else "Keine Carrier-Credentials",
        }

    def _gate_supplier(self) -> dict:
        ok = _configured("TECDOC_API_KEY", "SUPPLIER_API_KEY", "SUPPLIER_HUB_URL")
        return {
            "gate": "supplier/API",
            "label": GATE_LABELS_DE["supplier/API"],
            "status": "PASS" if ok else "BLOCKED",
            "blocking": not ok,
            "detail": "Lieferanten-API konfiguriert" if ok else "Keine Lieferanten-API-Credentials",
        }

    def _gate_email(self) -> dict:
        ok = _configured("SMTP_HOST", "EMAIL_API_KEY", "SENDGRID_API_KEY", "MAILGUN_API_KEY")
        return {
            "gate": "email",
            "label": GATE_LABELS_DE["email"],
            "status": "PASS" if ok else "BLOCKED",
            "blocking": not ok,
            "detail": "E-Mail-Versand konfiguriert" if ok else "Kein E-Mail-Provider konfiguriert",
        }

    def _gate_security(self) -> dict:
        ok = _configured("JWT_SECRET", "SESSION_SECRET", "ADMIN_PASSWORD")
        return {
            "gate": "security",
            "label": GATE_LABELS_DE["security"],
            "status": "PASS" if ok else "BLOCKED",
            "blocking": not ok,
            "detail": "Sicherheits-Secrets gesetzt" if ok else "JWT/Session/Admin-Secrets fehlen",
        }

    def _gate_backup(self) -> dict:
        ok = _configured("BACKUP_BUCKET", "BACKUP_S3_URL", "BUZZARD_BACKUP_ENABLED")
        return {
            "gate": "backup",
            "label": GATE_LABELS_DE["backup"],
            "status": "PASS" if ok else "BLOCKED",
            "blocking": not ok,
            "detail": "Backup konfiguriert" if ok else "Kein Backup-System konfiguriert",
        }

    def _gate_monitoring(self) -> dict:
        ok = _configured("SENTRY_DSN", "MONITORING_URL", "OTEL_EXPORTER_OTLP_ENDPOINT")
        return {
            "gate": "monitoring",
            "label": GATE_LABELS_DE["monitoring"],
            "status": "PASS" if ok else "BLOCKED",
            "blocking": not ok,
            "detail": "Monitoring/Alerting konfiguriert" if ok else "Kein Monitoring konfiguriert",
        }

    def _gate_legal(self) -> dict:
        ok = _configured("LEGAL_IMPRINT_URL", "BUZZARD_LEGAL_READY")
        return {
            "gate": "legal",
            "label": GATE_LABELS_DE["legal"],
            "status": "PASS" if ok else "BLOCKED",
            "blocking": not ok,
            "detail": "Rechtliche Seiten freigegeben" if ok else "Impressum/AGB noch nicht freigegeben",
        }

    def _gate_order(self) -> dict:
        ok = os.getenv("BUZZARD_SALES_ENABLED", "0") == "1"
        return {
            "gate": "end-to-end order",
            "label": GATE_LABELS_DE["end-to-end order"],
            "status": "PASS" if ok else "BLOCKED",
            "blocking": not ok,
            "detail": "Verkauf aktiv" if ok else "Katalogmodus — BUZZARD_SALES_ENABLED=0",
        }

    def _gate_return(self) -> dict:
        ok = _configured("BUZZARD_RETURNS_READY", "WIDERRUF_POLICY_URL")
        return {
            "gate": "return/Widerruf",
            "label": GATE_LABELS_DE["return/Widerruf"],
            "status": "PASS" if ok else "BLOCKED",
            "blocking": not ok,
            "detail": "Retoure/Widerruf freigegeben" if ok else "Retoure/Widerruf nicht freigegeben",
        }

    def _gate_gdpr(self) -> dict:
        ok = _configured("BUZZARD_GDPR_READY", "CONSENT_MANAGER_KEY", "COOKIE_CONSENT_READY")
        return {
            "gate": "GDPR/consent",
            "label": GATE_LABELS_DE["GDPR/consent"],
            "status": "PASS" if ok else "BLOCKED",
            "blocking": not ok,
            "detail": "DSGVO/Einwilligung konfiguriert" if ok else "DSGVO/Consent nicht freigegeben",
        }

    def evaluate_gates(self) -> list[dict]:
        return [
            self._gate_domain(),
            self._gate_tls(),
            self._gate_database(),
            self._gate_payment(),
            self._gate_shipping(),
            self._gate_supplier(),
            self._gate_email(),
            self._gate_security(),
            self._gate_backup(),
            self._gate_monitoring(),
            self._gate_legal(),
            self._gate_order(),
            self._gate_return(),
            self._gate_gdpr(),
        ]

    def preflight(self, check_legal_urls: bool = False) -> dict:
        return self._preflight.run_preflight(check_legal_urls=check_legal_urls)

    def save_preflight_report(self, path: str | Path | None = None) -> dict:
        return self._preflight.save_report(path)

    def max_single_summary(self) -> dict:
        manifest = self.load_manifest()
        preflight = self.preflight(check_legal_urls=False)
        return {
            **manifest,
            "version": "1.0-max-single",
            "primary_console_html": "/taxonomy/buzzard_production_bridge_max_single_file.html",
            "preflight_json": "/taxonomy/buzzard_production_preflight.json",
            "preflight": preflight,
            "gates_passed": preflight["passed"],
            "gates_total": preflight["total"],
            "readiness_pct": preflight["readiness_pct"],
            "go_live_allowed": preflight["go_live_allowed"],
        }

    def summary(self) -> dict:
        manifest = self.load_manifest()
        gates = self.evaluate_gates()
        passed = sum(1 for gate in gates if gate["status"] == "PASS")
        blocked = [gate for gate in gates if gate["blocking"]]
        return {
            **manifest,
            "gates_evaluated": len(gates),
            "gates_passed": passed,
            "gates_blocked": len(blocked),
            "ready_for_go_live": len(blocked) == 0,
            "go_live_rule": manifest.get("go_live_rule"),
            "important": manifest.get("important"),
            "gates": gates,
            "blocked_gates": [gate["gate"] for gate in blocked],
        }
