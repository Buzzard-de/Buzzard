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
        "     complete-analytics-demo, complete-analytics-docs",
        "     complete-production-demo, complete-production-readiness, complete-production-docs",
        "     complete-shop-bridge-demo, complete-shop-bridge-readiness, complete-shop-bridge-docs",
        "     complete-taxonomy-demo, complete-taxonomy-search, complete-taxonomy-path,",
        "     complete-taxonomy-snapshot, complete-taxonomy-docs",
        "     complete-taxonomy-unify-status, complete-taxonomy-unify-resolve, complete-taxonomy-unify-docs",
        "     complete-pim-demo, complete-pim-health, complete-pim-schema, complete-pim-docs",
        "     complete-multilingual-health, complete-multilingual-languages,",
        "     complete-multilingual-normalize, complete-multilingual-demo, complete-multilingual-docs",
        "     complete-import-engine-health, complete-import-engine-demo,",
        "     complete-import-engine-schema, complete-import-engine-docs",
        "     complete-phone-health, complete-phone-analyze, complete-phone-demo,",
        "     complete-phone-schema, complete-phone-docs",
        "     complete-phone-memory-health, complete-phone-memory-demo,",
        "     complete-phone-memory-context, complete-phone-memory-docs",
        "     complete-phone-telephony-health, complete-phone-telephony-demo,",
        "     complete-phone-telephony-schema, complete-phone-telephony-docs",
        "     complete-platform-health, complete-platform-modules, complete-platform-demo,",
        "     complete-platform-schema, complete-platform-docs",
        "     complete-production-integration-health, complete-production-integration-readiness,",
        "     complete-production-integration-demo, complete-production-integration-schema,",
        "     complete-production-integration-docs",
        "     complete-launch-sequence-health, complete-launch-sequence-stages,",
        "     complete-launch-sequence-demo, complete-launch-sequence-schema,",
        "     complete-launch-sequence-docs",
        "     complete-ai-council-18-health, complete-ai-council-18-agents,",
        "     complete-ai-council-18-demo, complete-ai-council-18-schema,",
        "     complete-ai-council-18-docs",
        "     complete-ai-council-19-health, complete-ai-council-19-agents,",
        "     complete-ai-council-19-assess, complete-ai-council-19-demo,",
        "     complete-ai-council-19-schema, complete-ai-council-19-docs",
        "     complete-category-intelligence-43-health, complete-category-intelligence-43-agents,",
        "     complete-category-intelligence-43-demo, complete-category-intelligence-43-schema,",
        "     complete-category-intelligence-43-docs",
        "     complete-social-intelligence-health, complete-social-intelligence-platforms,",
        "     complete-social-intelligence-demo, complete-social-intelligence-schema,",
        "     complete-social-intelligence-docs",
        "     complete-automotive-taxonomy-health, complete-automotive-taxonomy-seed,",
        "     complete-automotive-taxonomy-demo, complete-automotive-taxonomy-schema,",
        "     complete-automotive-taxonomy-docs,",
        "     complete-automotive-taxonomy-tires-categories, complete-automotive-taxonomy-tires-demo,",
        "     complete-automotive-taxonomy-tires-schema, complete-automotive-taxonomy-tires-docs",
        "     complete-agriculture-health, complete-agriculture-branches,",
        "     complete-agriculture-demo, complete-agriculture-schema, complete-agriculture-docs",
        "     complete-renewable-energy-health, complete-renewable-energy-branches,",
        "     complete-renewable-energy-demo, complete-renewable-energy-schema,",
        "     complete-renewable-energy-docs, complete-renewable-energy-taxonomy",
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
