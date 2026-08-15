from pathlib import Path

from buzzard_ai_complete.config.settings import APP_NAME, APP_VERSION, DB_PATH

PACK_DIR = Path(__file__).resolve().parent


def complete_status():
    scope = PACK_DIR / "docs" / "FINAL_SCOPE.md"
    arch = PACK_DIR / "docs" / "ARCHITECTURE.md"
    gaps = PACK_DIR / "docs" / "PRODUCTION_GAPS.md"
    lines = [
        "=== BUZZARD AI COMPLETE FINAL — STATUS ===",
        "",
        f"Platform: {APP_NAME} v{APP_VERSION}",
        f"Database: {DB_PATH}",
        "",
        "Final consolidated workspace:",
        "- Doğu Bey — research_url, research_question, memory, claims",
        "- Aslan Bey — orchestration, decompose, dispatch, execute, dashboard",
        "- Esat Bey — inspect security gate, scan_text, audit",
        "- BuzzardOrchestrator — Esat gate + Aslan execute chain",
        "- VerificationEngine, KnowledgeStore, ResearchEngine + providers",
        "",
        "CLI: complete-init, complete-agents, complete-task, complete-dispatch,",
        "     complete-orchestrate, complete-dashboard, complete-report,",
        "     complete-health, complete-ai-status, complete-scan, complete-test",
        "",
        "Abgrenzung:",
        "- COMPLETE FINAL → complete-* + buzzard_complete.db",
        "- GESAMT v2 → gesamt-* + buzzard.db",
        "- v29/v1 → verify-*, dogubey-*, aslan-*",
        "",
    ]
    if scope.exists():
        lines.append(scope.read_text(encoding="utf-8"))
        lines.append("")
    if arch.exists():
        lines.append(arch.read_text(encoding="utf-8"))
        lines.append("")
    if gaps.exists():
        lines.append(gaps.read_text(encoding="utf-8"))
    return "\n".join(lines)
