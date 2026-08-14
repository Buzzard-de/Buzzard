from pathlib import Path

INTELLIGENCE_DIR = Path(__file__).resolve().parent.parent
PRODUCTION_DIR = Path(__file__).resolve().parent


def workstreams():
    manifest = PRODUCTION_DIR / "FINAL_COMPLETION_MANIFEST.json"
    if manifest.exists():
        import json

        data = json.loads(manifest.read_text(encoding="utf-8"))
        return data.get("required_workstreams", [])
    return sorted(p.name for p in PRODUCTION_DIR.iterdir() if p.is_dir() and p.name[:2].isdigit())


def read_doc(name):
    path = PRODUCTION_DIR / name
    if path.exists():
        return path.read_text(encoding="utf-8")
    return f"Dokument nicht gefunden: {name}"


def production_status():
    from live_connectors import live_health_report

    module_count = len(
        [
            p
            for p in (INTELLIGENCE_DIR / "buzzard_intelligence").glob("*.py")
            if p.name != "__init__.py"
        ]
    )
    json_stores = len(list(INTELLIGENCE_DIR.glob("buzzard_v*.json")))
    archives = len(list((INTELLIGENCE_DIR / "archive").glob("*.zip")))
    workstream_dirs = len(workstreams())

    lines = [
        "=== BUZZARD PRODUCTION COMPLETION STATUS ===",
        f"Intelligence-Module (Python): {module_count}",
        f"JSON-Stores (lokal initialisiert): {json_stores}",
        f"Archive-Pakete: {archives}",
        f"Production-Workstreams: {workstream_dirs}",
        "",
        "Live Connectors:",
        live_health_report(),
        "",
        "Hinweis: Modul-Integration ≠ produktionsfertig.",
        "Siehe production/FINAL_MASTER_CHECKLIST.md und production/13_go_live/README.md",
    ]
    return "\n".join(lines)
