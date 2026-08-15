from pathlib import Path

from buzzard_ai_complete.config.settings import settings

PACK_DIR = Path(__file__).resolve().parent


def complete_status():
    gaps = PACK_DIR / "docs" / "PRODUCTION_GAPS.md"
    arch = PACK_DIR / "docs" / "ARCHITECTURE.md"
    lines = [
        "=== BUZZARD AI COMPLETE — STATUS ===",
        "",
        f"Database: {settings.database_path}",
        f"Environment: {settings.app_env}",
        "",
        "Consolidated workspace (ALLES_IN_EINEM_ORDNER):",
        "- Doğu Bey — Intelligence & OSINT (research, memory, findings)",
        "- Aslan Bey — Orchestrator (delegate_research, review, audit)",
        "- Esat Bey — Defensive security (scan_text, audit)",
        "",
        "Shared services: Database, SourceRegistry, TaskManager, MemoryStore,",
        "ResearchEngine, Verifier, EventBus, ReportBuilder",
        "",
        "CLI: complete-init, complete-agents, complete-task, complete-tasks,",
        "     complete-health, complete-scan, complete-test, complete-status",
        "",
        "Abgrenzung:",
        "- GESAMT v2 → gesamt-* + buzzard.db",
        "- COMPLETE → complete-* + buzzard_complete.db",
        "- v29/v1 → verify-*, dogubey-*, aslan-*",
        "",
    ]
    if arch.exists():
        lines.append(arch.read_text(encoding="utf-8"))
        lines.append("")
    if gaps.exists():
        lines.append(gaps.read_text(encoding="utf-8"))
    return "\n".join(lines)
