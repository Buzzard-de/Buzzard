from pathlib import Path

from buzzard_ai_gesamt.config.settings import APP_NAME, APP_VERSION, DB_PATH

GESAMT_DIR = Path(__file__).resolve().parent


def _count_scaffold_dirs():
    return sum(1 for p in GESAMT_DIR.rglob(".gitkeep"))


def gesamt_status():
    roadmap = GESAMT_DIR / "docs" / "STATUS_AND_ROADMAP.md"
    roadmap_v2 = GESAMT_DIR / "docs" / "ROADMAP_V2.md"
    scaffold_count = _count_scaffold_dirs()
    lines = [
        "=== BUZZARD AI GESAMT — STATUS (v2 + Scaffold) ===",
        "",
        f"Platform: {APP_NAME} v{APP_VERSION}",
        f"Unified DB: {DB_PATH}",
        f"Scaffold extension points: {scaffold_count} directories",
        "",
        "v2 Erweiterungen:",
        "- Versioned Memory (memory_history)",
        "- Research runs + source change detection",
        "- Esat Bey content scanning (defensive)",
        "- Optional LLM provider status (env-based)",
        "- API token authorization + health monitoring",
        "",
        "Scaffold (ALLE_FEHLENDEN_ORDNER):",
        "- Vollständiger Architektur-Baum mit Extension Points",
        "- agents/, memory/, research/, security/, api/, deploy/, tests/, …",
        "",
        "Agenten:",
        "- Doğu Bey: research, memory, claims, observations",
        "- Aslan Bey: orchestration, decompose, dispatch, audit",
        "- Esat Bey: security events + scan_text",
        "",
        "CLI: gesamt-init, gesamt-agents, gesamt-task, gesamt-dispatch,",
        "     gesamt-dashboard, gesamt-report, gesamt-health, gesamt-ai-status,",
        "     gesamt-tree, gesamt-inventory, gesamt-test, gesamt-status",
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
