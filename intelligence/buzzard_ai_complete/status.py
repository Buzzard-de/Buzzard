from pathlib import Path

from buzzard_ai_complete.config.settings import APP_NAME, APP_VERSION, DB_PATH

PACK_DIR = Path(__file__).resolve().parent


def complete_status():
    scope = PACK_DIR / "docs" / "FINAL_SCOPE.md"
    ethics = PACK_DIR / "docs" / "RESEARCH_ETHICS.md"
    checklist = PACK_DIR / "docs" / "PRODUCTION_CHECKLIST.md"
    arch = PACK_DIR / "docs" / "ARCHITECTURE.md"
    lines = [
        "=== BUZZARD AI COMPLETE vNext — STATUS ===",
        "",
        f"Platform: {APP_NAME} v{APP_VERSION}",
        f"Database: {DB_PATH}",
        "",
        "vNext Erweiterungen:",
        "- BuzzardPolicy (defensive action gate)",
        "- RateLimiter, SecretProvider, Metrics",
        "- LLM/Search/Notification integration adapters",
        "- Task scheduler, async runner, model contracts",
        "- Docker compose + production checklist",
        "",
        "o2 Erweiterungen:",
        "- Vollständiger Architektur-Scaffold (97 Extension Points)",
        "- complete-tree, complete-inventory, complete-verify",
        "- ERROR_FREE_CHECK Dokumentation",
        "",
        "CLI: complete-init, complete-orchestrate, complete-policy, complete-metrics,",
        "     complete-health, complete-scan, complete-test, complete-status,",
        "     complete-tree, complete-inventory, complete-verify,",
        "     complete-maintain, complete-scheduler",
        "     complete-commerce-demo, complete-commerce-evaluate",
        "     complete-commerce-scope, complete-commerce-tree, complete-commerce-inventory,",
        "     complete-commerce-production-work, complete-commerce-integration-order",
        "     complete-logistics-demo, complete-logistics-recommend, complete-logistics-docs",
        "     complete-order-demo, complete-order-process, complete-order-docs",
        "     complete-billing-demo, complete-billing-refund, complete-billing-docs",
        "     complete-crm-demo, complete-crm-segment, complete-crm-docs",
        "     complete-marketing-demo, complete-marketing-budget, complete-marketing-docs",
        "     complete-max-demo, complete-max-snapshot, complete-max-docs",
        "     complete-one-piece-demo, complete-one-piece-e2e, complete-one-piece-docs",
        "",
        "fehler_behebung_2:",
        "- Removed tests/commerce package markers (pytest shadowing fix)",
        "- Hardened complete-verify import sweep",
        "",
        "Abgrenzung:",
        "- COMPLETE vNext → complete-* + buzzard_complete.db",
        "- GESAMT v2 → gesamt-* + buzzard.db",
        "- v29/v1 → verify-*, dogubey-*, aslan-*",
        "",
    ]
    if scope.exists():
        lines.append(scope.read_text(encoding="utf-8"))
        lines.append("")
    if ethics.exists():
        lines.append(ethics.read_text(encoding="utf-8"))
        lines.append("")
    if checklist.exists():
        lines.append(checklist.read_text(encoding="utf-8"))
        lines.append("")
    if arch.exists():
        lines.append(arch.read_text(encoding="utf-8"))
    return "\n".join(lines)
