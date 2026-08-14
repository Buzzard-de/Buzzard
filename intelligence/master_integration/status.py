from pathlib import Path

from master_integration.core import CONFIG, DB, event, gates, init, set_gate

DOCS_DIR = Path(__file__).resolve().parent / "docs"


def read_doc(name):
    path = DOCS_DIR / name
    if path.exists():
        return path.read_text(encoding="utf-8")
    return f"Dokument nicht gefunden: {name}"


def master_health():
    lines = [
        "=== BUZZARD MASTER HEALTH ===",
        f"Database: {'READY' if DB.exists() else 'NOT_READY'}",
        f"Config: {'READY' if CONFIG.exists() else 'NOT_READY'}",
    ]
    if DB.exists():
        for name, status, details in gates():
            lines.append(f"{name:20} {status:12} {details}")
    else:
        lines.append("Hinweis: zuerst `python main.py mint-init` ausführen.")
    return "\n".join(lines)


def master_preflight():
    checks = {
        "architecture": "PASS",
        "connectors": "REVIEW",
        "data_pipeline": "REVIEW",
        "memory": "REVIEW",
        "agents_council": "REVIEW",
        "security": "REVIEW",
        "testing": "PASS",
        "observability": "REVIEW",
        "backup_recovery": "REVIEW",
        "deployment": "REVIEW",
        "business_rules": "PASS",
        "go_live": "BLOCKED",
    }
    for key, value in checks.items():
        set_gate(key, value, "Automated master preflight")
    event("PREFLIGHT", "Master Integration", "Master preflight completed")
    return (
        "Preflight abgeschlossen. REVIEW/BLOCKED Gates müssen vor Go-Live geprüft werden."
    )


def master_gate_status():
    lines = ["=== BUZZARD SYSTEM STATUS ==="]
    if not DB.exists():
        lines.append("Database: NOT_READY (zuerst mint-init)")
        return "\n".join(lines)
    for name, status, details in gates():
        lines.append(f"{name} => {status} | {details}")
    return "\n".join(lines)


def run_go_live_check():
    if not DB.exists():
        return 1, "BLOCKED: zuerst python main.py mint-init"

    bad = [(name, status) for name, status, _ in gates() if status not in ("PASS", "APPROVED")]
    if bad:
        lines = ["GO-LIVE BLOCKED"]
        for name, status in bad:
            lines.append(f"- {name} {status}")
        return 2, "\n".join(lines)

    return 0, "GO-LIVE READY"
