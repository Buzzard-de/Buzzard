import json
import subprocess
import sys
from pathlib import Path

PACK_DIR = Path(__file__).resolve().parent


def read_doc(name):
    path = PACK_DIR / "docs" / name
    if path.exists():
        return path.read_text(encoding="utf-8")
    return f"Dokument nicht gefunden: {name}"


def engine():
    from website_monitoring.connectors.monitor import MonitoringEngine

    return MonitoringEngine()


def monitoring_status():
    mon = engine()
    sites = mon.list_sites()
    enabled = sum(1 for s in sites if s.get("enabled"))
    not_connected = sum(1 for s in sites if mon.status(s) == "NOT_CONNECTED")
    ready = sum(1 for s in sites if mon.status(s) == "READY_FOR_AUTHORIZED_CONNECTOR")
    manifest = json.loads((PACK_DIR / "MANIFEST.json").read_text(encoding="utf-8"))
    lines = [
        "=== BUZZARD MARKETPLACE & WEBSITE MONITORING ===",
        f"Katalog-Sites: {len(sites)}",
        f"Aktiviert (enabled): {enabled}",
        f"NOT_CONNECTED: {not_connected}",
        f"READY_FOR_AUTHORIZED_CONNECTOR: {ready}",
        "",
        f"Primary: {', '.join(manifest.get('primary_sites', []))}",
        "",
        "Regel: Nur autorisierte Quellen aktivieren. Keine erfundenen Live-Daten.",
        "Siehe docs/LEGAL_OPERATION.md",
    ]
    return "\n".join(lines)


def list_sites_table():
    mon = engine()
    lines = ["=== WEBSITE MONITORING CATALOG ==="]
    for site in mon.list_sites():
        lines.append(
            f"{site['name']:35} {mon.status(site):30} {site.get('type', '')}"
        )
    return "\n".join(lines)


def show_schedule():
    data = json.loads((PACK_DIR / "scheduler/monitor_schedule.json").read_text(encoding="utf-8"))
    return json.dumps(data, ensure_ascii=False, indent=2)


def show_manifest():
    data = json.loads((PACK_DIR / "MANIFEST.json").read_text(encoding="utf-8"))
    return json.dumps(data, ensure_ascii=False, indent=2)


def public_fetch(url):
    mon = engine()
    return mon.public_fetch(url)


def run_tests():
    result = subprocess.run(
        [sys.executable, "-m", "pytest", str(PACK_DIR / "tests"), "-q"],
        cwd=PACK_DIR,
    )
    return result.returncode
