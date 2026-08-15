from pathlib import Path

from buzzard_ai_gesamt.config.settings import APP_NAME, APP_VERSION, DB_PATH

GESAMT_DIR = Path(__file__).resolve().parent


def gesamt_status():
    roadmap = GESAMT_DIR / "docs" / "STATUS_AND_ROADMAP.md"
    roadmap_v2 = GESAMT_DIR / "docs" / "ROADMAP_V2.md"
    lines = [
        "=== BUZZARD AI GESAMT — STATUS (v2) ===",
        "",
        f"Platform: {APP_NAME} v{APP_VERSION}",
        f"Unified DB: {DB_PATH}",
        "",
        "v2 Erweiterungen:",
        "- Versioned Memory (memory_history)",
        "- Research runs + source change detection",
        "- Esat Bey content scanning (defensive)",
        "- Optional LLM provider status (env-based)",
        "- API token authorization + health monitoring",
        "",
        "Agenten:",
        "- Doğu Bey: research, memory, claims, observations",
        "- Aslan Bey: orchestration, decompose, dispatch, audit",
        "- Esat Bey: security events + scan_text",
        "",
        "Parallel im Stack (v29/v1):",
        "- verify-*, dogubey-* → buzzard_intelligence/verify.py",
        "- aslan-* → buzzard_intelligence/aslan.py (v1 secretary)",
        "",
        "CLI: gesamt-init, gesamt-agents, gesamt-task, gesamt-dispatch,",
        "     gesamt-dashboard, gesamt-report, gesamt-health, gesamt-ai-status,",
        "     gesamt-test, gesamt-status",
        "",
    ]
    if roadmap_v2.exists():
        lines.append(roadmap_v2.read_text(encoding="utf-8"))
        lines.append("")
    if roadmap.exists():
        lines.append(roadmap.read_text(encoding="utf-8"))
    else:
        lines.append("Roadmap-Dokument nicht gefunden.")
    return "\n".join(lines)
