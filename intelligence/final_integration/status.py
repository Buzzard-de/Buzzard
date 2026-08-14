from pathlib import Path
import subprocess
import sys

PACK_DIR = Path(__file__).resolve().parent

REQUIRED_FILES = [
    "01_integration/system_manifest.json",
    "02_connectors/CONNECTOR_CHECKLIST.md",
    "03_data_pipeline/PIPELINE_CHECKLIST.md",
    "05_security/SECURITY_GATE.md",
    "06_observability/MONITORING.md",
    "07_backup/BACKUP_RESTORE.md",
    "08_deployment/DEPLOYMENT.md",
    "09_go_live/GO_LIVE_GATE.md",
]


def read_doc(*parts):
    path = PACK_DIR.joinpath(*parts)
    if path.exists():
        return path.read_text(encoding="utf-8")
    return f"Dokument nicht gefunden: {path.relative_to(PACK_DIR)}"


def run_preflight():
    missing = [path for path in REQUIRED_FILES if not (PACK_DIR / path).exists()]
    if missing:
        lines = ["PREFLIGHT FAILED"]
        for path in missing:
            lines.append(f"- {path}")
        return 1, "\n".join(lines)
    return 0, "PREFLIGHT OK"


def run_tests():
    result = subprocess.run(
        [sys.executable, "-m", "pytest", str(PACK_DIR / "04_tests"), "-q"],
        cwd=PACK_DIR,
    )
    return result.returncode


def run_go_live_check():
    return (
        2,
        "\n".join(
            [
                "=== BUZZARD GO-LIVE CHECK ===",
                "BLOCKED until all real production gates are verified.",
                "No live PASS results are fabricated by this script.",
            ]
        ),
    )


def integration_status():
    code, preflight = run_preflight()
    lines = [
        "=== BUZZARD FINAL INTEGRATION / TEST / GO-LIVE STATUS ===",
        preflight,
        "",
        "Checklisten:",
    ]
    for rel in REQUIRED_FILES:
        status = "READY" if (PACK_DIR / rel).exists() else "MISSING"
        lines.append(f"- {rel}: {status}")
    lines.extend(
        [
            "",
            "Hinweis: Echte Credentials und externe Dienste bleiben PENDING/REVIEW,",
            "bis sie tatsächlich verbunden und getestet wurden.",
            "Siehe auch `mint-*` (Gates) und `prod-*` (Production Workstreams).",
        ]
    )
    return code, "\n".join(lines)
