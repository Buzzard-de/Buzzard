#!/usr/bin/env python3
import argparse
from pathlib import Path

from buzzard_intelligence import (
    APILayer,
    Analyzer,
    CategoryDiscovery,
    Collector,
    CompetitorIntel,
    Council,
    IntelligenceDB,
    MemoryEngine,
    Reporter,
    Scheduler,
    SEED_CATEGORIES,
    SharedMemory,
    TrendEngine,
    MultilingualMemory,
    TrustEngine,
    ProfitEngine,
    MarketEngine,
    SupplierIntel,
    RiskEngine,
    CouncilOrchestrator,
    AIGateway,
    WebResearch,
)


def main():
    parser = argparse.ArgumentParser(
        description="Buzzard Intelligence v1–v22 (Memory … AI Gateway, Web Research)"
    )
    sub = parser.add_subparsers(dest="cmd")

    sub.add_parser("init", help="Create v1 + v2 + v4 + v5 SQLite schemas")
    sub.add_parser("init-v1", help="Create v1 SQLite schema only")
    sub.add_parser("init-v2", help="Create v2 memory schema only")
    sub.add_parser("init-v4", help="Create v4 scheduler schema only")
    sub.add_parser("init-v5", help="Create v5 API layer schema only")
    sub.add_parser("init-v8", help="Create v8 category discovery schema only")
    sub.add_parser("init-v9", help="Create v9 reporting/alerts schema only")
    sub.add_parser("init-v10", help="Create v10 council integration schema only")
    sub.add_parser("init-v12", help="Create v12 shared memory schema only")
    sub.add_parser("init-v13", help="Create v13 multilingual intelligence schema only")
    sub.add_parser("init-v14", help="Create v14 competitor intelligence schema only")
    sub.add_parser("init-v15", help="Create v15 authenticity/trust schema only")
    sub.add_parser("init-v16", help="Create v16 profitability schema only")
    sub.add_parser("init-v17", help="Create v17 market opportunity schema only")
    sub.add_parser("init-v18", help="Create v18 supplier intelligence schema only")
    sub.add_parser("init-v19", help="Create v19 risk/compliance schema only")
    sub.add_parser("init-v20", help="Create v20 council orchestrator schema only")
    sub.add_parser("init-v21", help="Create v21 AI agent gateway schema only")
    sub.add_parser("init-v22", help="Create v22 web research schema only")
    sub.add_parser("seed", help="Seed legacy TR main categories (v1 + v2)")
    sub.add_parser("seed-de", help="Seed 41 German Buzzard main categories (v1 + v2)")
    sub.add_parser("seed-tasks", help="Create placeholder scan tasks for legacy TR categories (v4)")
    sub.add_parser("seed-tasks-de", help="Create placeholder scan tasks for 41 DE categories (v4)")
    sub.add_parser("report", help="v1 summary report")
    sub.add_parser("report-v2", help="v2 memory summary report")
    sub.add_parser("changes", help="v2 detected changes (price, popularity, discoveries)")
    sub.add_parser("export-memory", help="Export v2 memory snapshot to JSON")
    sub.add_parser("tasks", help="List v4 scan tasks")
    sub.add_parser("run", help="Run due v4 scan tasks via v3 collector")
    sub.add_parser("sources", help="List v5 API/feed sources")
    sub.add_parser("test-apis", help="Test enabled v5 API sources")
    sub.add_parser("schema", help="Show v5 source schema example JSON")
    sub.add_parser("analyze", help="v6 market/category analysis report from v2 memory")
    sub.add_parser("demo", help="v6 add German demo observations to v2 memory")
    sub.add_parser("demo-trends", help="v7 add time-series demo data to v2 memory")
    sub.add_parser("trends", help="v7 trend and opportunity report from v2 memory")
    sub.add_parser("sync-categories", help="v8 load known categories from data/buzzard_categories.json")
    sub.add_parser("demo-discovery", help="v8 add German demo category signals")
    sub.add_parser("discover", help="v8 category discovery report")
    sub.add_parser("refresh-alerts", help="v9 rebuild alerts from memory/discovery events")
    sub.add_parser("intel-report", help="v9 management intelligence report")
    sub.add_parser("alerts", help="v9 active intelligence alerts")
    sub.add_parser("queue", help="v9 prioritized intelligence queue")
    sub.add_parser("demo-reporting", help="v9 demo data + alert refresh")
    sub.add_parser("inbox", help="v10 council review inbox")
    sub.add_parser("council-board", help="v10 council status board")
    sub.add_parser("demo-council", help="v10 demo council events")
    sub.add_parser("sync-council", help="v10 import open v9 alerts into council inbox")

    council_event = sub.add_parser("council-event", help="v10 create intelligence event")
    council_event.add_argument("--type", required=True)
    council_event.add_argument("--title", required=True)
    council_event.add_argument("--details", default="")
    council_event.add_argument("--source", default="")
    council_event.add_argument("--priority", type=int, default=5)
    council_event.add_argument("--from-agent", default="Buzzard Intelligence")

    council_assign = sub.add_parser("council-assign", help="v10 assign event to reviewer")
    council_assign.add_argument("--event-id", type=int, required=True)
    council_assign.add_argument("--agent", required=True)

    council_review = sub.add_parser("council-review", help="v10 record event review decision")
    council_review.add_argument("--event-id", type=int, required=True)
    council_review.add_argument("--decision", required=True)
    council_review.add_argument("--note", default="")
    council_review.add_argument("--agent", default="Council Manager")

    voice = sub.add_parser("voice", help="v11 start local voice interface server")
    voice.add_argument("--host", default="127.0.0.1")
    voice.add_argument("--port", type=int, default=8787)

    remember = sub.add_parser("remember", help="v12 store a shared memory entry")
    remember.add_argument("--type", required=True, help="DECISION, TASK, PREFERENCE, CONVERSATION, …")
    remember.add_argument("--text", required=True)
    remember.add_argument("--source", default="system")
    remember.add_argument("--confidence", type=float, default=0.8)
    remember.add_argument("--tags", default="")
    remember.add_argument("--entity", default="")

    recall = sub.add_parser("recall", help="v12 search shared memory")
    recall.add_argument("--query", required=True)

    sub.add_parser("shared-timeline", help="v12 shared memory timeline (newest first)")

    memory_status = sub.add_parser("memory-status", help="v12 update shared memory status")
    memory_status.add_argument("--id", type=int, required=True)
    memory_status.add_argument("--status", required=True, help="ACTIVE, VERIFIED, DISPUTED, ARCHIVED, REJECTED")
    memory_status.add_argument("--actor", default="system")

    shared_link = sub.add_parser("shared-link", help="v12 link two shared memory entries")
    shared_link.add_argument("--from-id", type=int, required=True)
    shared_link.add_argument("--to-id", type=int, required=True)
    shared_link.add_argument("--relation", default="related")

    term_add = sub.add_parser("term-add", help="v13 register a multilingual term for a canonical entity")
    term_add.add_argument("--language", required=True)
    term_add.add_argument("--text", required=True)
    term_add.add_argument("--canonical", required=True)
    term_add.add_argument("--entity", default="")
    term_add.add_argument("--source", default="system")
    term_add.add_argument("--confidence", type=float, default=0.8)

    sub.add_parser("ml-demo", help="v13 add demo multilingual product terms")
    sub.add_parser("ml-report", help="v13 multilingual intelligence report")

    competitor_add = sub.add_parser("competitor-add", help="v14 register a public competitor/store")
    competitor_add.add_argument("--name", required=True)
    competitor_add.add_argument("--country", default="")
    competitor_add.add_argument("--source", required=True)

    competitor_product = sub.add_parser(
        "competitor-product", help="v14 record a public competitor product observation"
    )
    competitor_product.add_argument("--competitor", required=True)
    competitor_product.add_argument("--category", required=True)
    competitor_product.add_argument("--name", required=True)
    competitor_product.add_argument("--brand", default="")
    competitor_product.add_argument("--price", type=float)
    competitor_product.add_argument("--currency", default="EUR")
    competitor_product.add_argument("--popularity", type=float)
    competitor_product.add_argument("--source", required=True)

    sub.add_parser("competitor-demo", help="v14 add demo competitor intelligence data")
    sub.add_parser("competitor-report", help="v14 competitor/market intelligence report")

    trust_product = sub.add_parser("trust-product", help="v15 register a product for authenticity review")
    trust_product.add_argument("--name", required=True)
    trust_product.add_argument("--brand", default="")
    trust_product.add_argument("--supplier", default="")
    trust_product.add_argument("--source", default="")

    trust_evidence = sub.add_parser("trust-evidence", help="v15 add evidence document for a product")
    trust_evidence.add_argument("--product-id", type=int, required=True)
    trust_evidence.add_argument("--type", required=True)
    trust_evidence.add_argument("--issuer", default="")
    trust_evidence.add_argument("--reference", default="")

    trust_verify = sub.add_parser("trust-verify", help="v15 update product verification status")
    trust_verify.add_argument("--product-id", type=int, required=True)
    trust_verify.add_argument(
        "--status",
        required=True,
        help="UNVERIFIED, PENDING, VERIFIED, REJECTED, DISPUTED",
    )
    trust_verify.add_argument("--note", default="")

    sub.add_parser("trust-demo", help="v15 add demo authenticity/trust data")
    sub.add_parser("trust-report", help="v15 authenticity and trust report")

    profit_calc = sub.add_parser("profit-calc", help="v16 calculate product profitability")
    profit_calc.add_argument("--name", required=True)
    profit_calc.add_argument("--sale", type=float, required=True)
    profit_calc.add_argument("--cost", type=float, required=True)
    profit_calc.add_argument("--shipping", type=float, default=0)
    profit_calc.add_argument("--marketplace", type=float, default=0)
    profit_calc.add_argument("--payment", type=float, default=0)
    profit_calc.add_argument("--ads", type=float, default=0)
    profit_calc.add_argument("--packaging", type=float, default=0)
    profit_calc.add_argument("--other", type=float, default=0)
    profit_calc.add_argument(
        "--tax",
        type=float,
        default=0,
        help="Steuer-/MwSt.-Effekt als direkter EUR-Aufwand",
    )

    sub.add_parser("profit-demo", help="v16 add demo profitability records")
    sub.add_parser("profit-report", help="v16 profitability report")

    market_add = sub.add_parser("market-add", help="v17 register a country/market profile")
    market_add.add_argument("--country", required=True)
    market_add.add_argument("--market", required=True)
    market_add.add_argument("--demand", type=float, default=None)
    market_add.add_argument("--competition", type=float, default=None)
    market_add.add_argument("--logistics", type=float, default=None)
    market_add.add_argument("--risk", type=float, default=None)

    opportunity_add = sub.add_parser("opportunity-add", help="v17 register a product market opportunity")
    opportunity_add.add_argument("--country", required=True)
    opportunity_add.add_argument("--category", required=True)
    opportunity_add.add_argument("--product", required=True)
    opportunity_add.add_argument("--demand", type=float, default=None)
    opportunity_add.add_argument("--competition", type=float, default=None)
    opportunity_add.add_argument("--margin", type=float, default=None)
    opportunity_add.add_argument("--logistics", type=float, default=None)
    opportunity_add.add_argument("--risk", type=float, default=None)

    sub.add_parser("market-demo", help="v17 add demo market/opportunity data")
    sub.add_parser("market-report", help="v17 market and country opportunity report")

    supplier_add = sub.add_parser("supplier-add", help="v18 register a supplier profile")
    supplier_add.add_argument("--name", required=True)
    supplier_add.add_argument("--country", default="")
    supplier_add.add_argument("--b2b", default="unknown")
    supplier_add.add_argument("--source", required=True)

    supplier_capability = sub.add_parser(
        "supplier-capability", help="v18 register a supplier integration capability"
    )
    supplier_capability.add_argument("--supplier", required=True)
    supplier_capability.add_argument("--capability", required=True)
    supplier_capability.add_argument("--status", required=True)
    supplier_capability.add_argument("--evidence", default="")

    sub.add_parser("supplier-demo", help="v18 add demo supplier intelligence data")
    sub.add_parser("supplier-report", help="v18 supplier intelligence report")

    risk_add = sub.add_parser("risk-add", help="v19 register a risk/compliance signal")
    risk_add.add_argument("--entity", required=True)
    risk_add.add_argument("--type", required=True, help="AUTHENTICITY, SUPPLIER, PRODUCT_SAFETY, …")
    risk_add.add_argument("--severity", required=True, help="LOW, MEDIUM, HIGH, CRITICAL")
    risk_add.add_argument("--details", default="")
    risk_add.add_argument("--source", default="")
    risk_add.add_argument("--country", default="")

    risk_verify = sub.add_parser("risk-verify", help="v19 update risk review status")
    risk_verify.add_argument("--risk-id", type=int, required=True)
    risk_verify.add_argument(
        "--status",
        required=True,
        help="OPEN, UNDER_REVIEW, VERIFIED, RESOLVED, REJECTED",
    )
    risk_verify.add_argument("--note", default="")
    risk_verify.add_argument("--reviewer", default="Council Manager")

    sub.add_parser("risk-demo", help="v19 add demo risk/compliance records")
    sub.add_parser("risk-report", help="v19 risk and compliance report")

    orch_create = sub.add_parser("orch-create", help="v20 create a council orchestration task")
    orch_create.add_argument("--title", required=True)
    orch_create.add_argument("--details", default="")
    orch_create.add_argument("--priority", type=int, default=5)
    orch_create.add_argument("--created-by", default="Council Manager")

    orch_assign = sub.add_parser("orch-assign", help="v20 assign task to expert agent")
    orch_assign.add_argument("--task-id", type=int, required=True)
    orch_assign.add_argument("--agent", required=True)

    orch_opinion = sub.add_parser("orch-opinion", help="v20 record expert opinion on a task")
    orch_opinion.add_argument("--task-id", type=int, required=True)
    orch_opinion.add_argument("--agent", required=True)
    orch_opinion.add_argument("--decision", required=True)
    orch_opinion.add_argument("--confidence", type=float, default=0.8)
    orch_opinion.add_argument("--note", default="")

    sub.add_parser("orch-demo", help="v20 add demo council orchestration workflow")
    sub.add_parser("orch-board", help="v20 council orchestrator board")

    ai_add_provider = sub.add_parser("ai-add-provider", help="v21 register an AI provider")
    ai_add_provider.add_argument("--name", required=True)
    ai_add_provider.add_argument("--base-url", required=True)
    ai_add_provider.add_argument("--model", required=True)
    ai_add_provider.add_argument("--api-key-env", default="BUZZARD_AI_API_KEY")

    sub.add_parser("ai-providers", help="v21 list configured AI providers")
    sub.add_parser("ai-demo", help="v21 add demo AI gateway provider")

    research_create = sub.add_parser("research-create", help="v22 create a web research job")
    research_create.add_argument("--query", required=True)
    research_create.add_argument("--purpose", default="General Intelligence")

    research_source = sub.add_parser("research-source", help="v22 add a public web source to research")
    research_source.add_argument("--research-id", type=int, required=True)
    research_source.add_argument("--url", required=True)
    research_source.add_argument("--title", default="")
    research_source.add_argument("--domain", default="")

    research_finding = sub.add_parser("research-finding", help="v22 add a sourced finding to research")
    research_finding.add_argument("--research-id", type=int, required=True)
    research_finding.add_argument("--source-id", type=int, required=True)
    research_finding.add_argument("--claim", required=True)
    research_finding.add_argument("--confidence", type=float, default=0.8)
    research_finding.add_argument("--note", default="")

    sub.add_parser("research-demo", help="v22 add demo web research records")
    sub.add_parser("research-report", help="v22 web research report")

    add_category = sub.add_parser("add-category", help="v8 register a sourced category candidate")
    add_category.add_argument("--name", required=True)
    add_category.add_argument("--parent", default="")
    add_category.add_argument("--level", type=int, default=1)
    add_category.add_argument("--source", required=True)
    add_category.add_argument("--confidence", type=float, default=0.8)

    memory = sub.add_parser("memory", help="Search v2 memory by product, brand, or category")
    memory.add_argument("query")

    collect = sub.add_parser("collect", help="Collect one public HTML source (v3, robots.txt aware)")
    collect.add_argument("--url", required=True)
    collect.add_argument("--category", required=True)
    collect.add_argument("--subcategory", default="")
    collect.add_argument("--country", default="DE")
    collect.add_argument("--platform", default="public_web")

    collect_list = sub.add_parser("collect-list", help="Collect multiple URLs from a text file (v3)")
    collect_list.add_argument("file", help="One URL per line; lines starting with # are ignored")
    collect_list.add_argument("--category", required=True)
    collect_list.add_argument("--subcategory", default="")
    collect_list.add_argument("--country", default="DE")
    collect_list.add_argument("--platform", default="public_web")

    add_task = sub.add_parser("add-task", help="Add a v4 scan task with source URL")
    add_task.add_argument("--category", required=True)
    add_task.add_argument("--subcategory", default="")
    add_task.add_argument("--url", required=True)
    add_task.add_argument("--country", default="DE")
    add_task.add_argument("--platform", default="public_web")
    add_task.add_argument("--interval", type=int, default=1440, help="Minutes between runs (min 60)")
    add_task.add_argument("--priority", type=int, default=5)

    add_api = sub.add_parser("add-api", help="Register a v5 official API or feed source")
    add_api.add_argument("--name", required=True)
    add_api.add_argument("--base-url", required=True)
    add_api.add_argument("--category", required=True)
    add_api.add_argument("--country", default="DE")
    add_api.add_argument("--platform", default="official_api")
    add_api.add_argument("--interval", type=int, default=1440)
    add_api.add_argument("--priority", type=int, default=8)
    add_api.add_argument("--auth-env", default="BUZZARD_API_KEY")

    p = sub.add_parser("add-observation", help="Record a sourced observation (v2 memory engine)")
    p.add_argument("--category", required=True)
    p.add_argument("--subcategory", default="")
    p.add_argument("--subsubcategory", default="")
    p.add_argument("--product", required=True)
    p.add_argument("--brand", default="")
    p.add_argument("--platform", default="")
    p.add_argument("--country", default="")
    p.add_argument("--price", type=float)
    p.add_argument("--currency", default="EUR")
    p.add_argument("--popularity", type=float)
    p.add_argument("--source-url", required=True)
    p.add_argument("--source-name", default="")
    p.add_argument("--confidence", type=float, default=0.70)

    args = parser.parse_args()
    v1 = IntelligenceDB()
    v2 = MemoryEngine()
    v3 = Collector(v2)
    v4 = Scheduler(v3)
    v5 = APILayer()
    v6 = Analyzer(v2)
    v7 = TrendEngine(v2)
    v8 = CategoryDiscovery()
    v9 = Reporter(v2, v8)
    v10 = Council()
    v12 = SharedMemory()
    v13 = MultilingualMemory()
    v14 = CompetitorIntel()
    v15 = TrustEngine()
    v16 = ProfitEngine()
    v17 = MarketEngine()
    v18 = SupplierIntel()
    v19 = RiskEngine()
    v20 = CouncilOrchestrator()
    v21 = AIGateway()
    v22 = WebResearch()

    if args.cmd == "init":
        v1.init()
        v2.init()
        v4.init()
        v5.init()
        v8.init()
        v9.init()
        v10.init()
        v12.init()
        v13.init()
        v14.init()
        v15.init()
        v16.init()
        v17.init()
        v18.init()
        v19.init()
        v20.init()
        v21.init()
        v22.init()
        print(f"v1 database ready at {Path(v1.path).resolve()}")
        print(f"v2 memory engine ready at {Path(v2.path).resolve()}")
        print(f"v4 scheduler ready at {Path(v4.path).resolve()}")
        print(f"v5 API layer ready at {Path(v5.path).resolve()}")
        print(f"v8 category discovery ready at {Path(v8.path).resolve()}")
        print(f"v9 reporting ready at {Path(v9.path).resolve()}")
        print(f"v10 council ready at {Path(v10.path).resolve()}")
        print(f"v12 shared memory ready at {Path(v12.path).resolve()}")
        print(f"v13 multilingual ready at {Path(v13.path).resolve()}")
        print(f"v14 competitor intel ready at {Path(v14.path).resolve()}")
        print(f"v15 trust engine ready at {Path(v15.path).resolve()}")
        print(f"v16 profit engine ready at {Path(v16.path).resolve()}")
        print(f"v17 market engine ready at {Path(v17.path).resolve()}")
        print(f"v18 supplier intel ready at {Path(v18.path).resolve()}")
        print(f"v19 risk engine ready at {Path(v19.path).resolve()}")
        print(f"v20 council orchestrator ready at {Path(v20.path).resolve()}")
        print(f"v21 AI gateway ready at {Path(v21.path).resolve()}")
        print(f"v22 web research ready at {Path(v22.path).resolve()}")
    elif args.cmd == "init-v1":
        v1.init()
        print(f"v1 database ready at {Path(v1.path).resolve()}")
    elif args.cmd == "init-v2":
        v2.init()
        print(f"v2 memory engine ready at {Path(v2.path).resolve()}")
    elif args.cmd == "init-v4":
        v4.init()
        print(f"v4 scheduler ready at {Path(v4.path).resolve()}")
    elif args.cmd == "init-v5":
        v5.init()
        print(f"v5 API layer ready at {Path(v5.path).resolve()}")
    elif args.cmd == "init-v8":
        v8.init()
        print(f"v8 category discovery ready at {Path(v8.path).resolve()}")
    elif args.cmd == "init-v9":
        v9.init()
        print(f"v9 reporting ready at {Path(v9.path).resolve()}")
    elif args.cmd == "init-v10":
        v10.init()
        print(f"v10 council ready at {Path(v10.path).resolve()}")
    elif args.cmd == "init-v12":
        v12.init()
        print(f"v12 shared memory ready at {Path(v12.path).resolve()}")
    elif args.cmd == "init-v13":
        v13.init()
        print(f"v13 multilingual ready at {Path(v13.path).resolve()}")
    elif args.cmd == "init-v14":
        v14.init()
        print(f"v14 competitor intel ready at {Path(v14.path).resolve()}")
    elif args.cmd == "init-v15":
        v15.init()
        print(f"v15 trust engine ready at {Path(v15.path).resolve()}")
    elif args.cmd == "init-v16":
        v16.init()
        print(f"v16 profit engine ready at {Path(v16.path).resolve()}")
    elif args.cmd == "init-v17":
        v17.init()
        print(f"v17 market engine ready at {Path(v17.path).resolve()}")
    elif args.cmd == "init-v18":
        v18.init()
        print(f"v18 supplier intel ready at {Path(v18.path).resolve()}")
    elif args.cmd == "init-v19":
        v19.init()
        print(f"v19 risk engine ready at {Path(v19.path).resolve()}")
    elif args.cmd == "init-v20":
        v20.init()
        print(f"v20 council orchestrator ready at {Path(v20.path).resolve()}")
    elif args.cmd == "init-v21":
        v21.init()
        print(f"v21 AI gateway ready at {Path(v21.path).resolve()}")
    elif args.cmd == "init-v22":
        v22.init()
        print(f"v22 web research ready at {Path(v22.path).resolve()}")
    elif args.cmd == "seed":
        v1.init()
        v2.init()
        v1.seed_categories(SEED_CATEGORIES)
        count = v2.seed_categories()
        print(f"Seeded {count} legacy main categories into v1 and v2.")
    elif args.cmd == "seed-de":
        v1.init()
        v2.init()
        count_v1 = v1.seed_categories_de()
        count_v2 = v2.seed_categories_de()
        print(f"Seeded {count_v1} German main categories into v1 and {count_v2} into v2.")
    elif args.cmd == "seed-tasks":
        v4.init()
        count = v4.seed_tasks()
        print(f"{count} Platzhalter-Aufgaben für TR-Kategorien erstellt.")
    elif args.cmd == "seed-tasks-de":
        v4.init()
        count = v4.seed_tasks_de()
        print(f"{count} Platzhalter-Aufgaben für DE-Kategorien erstellt.")
    elif args.cmd == "tasks":
        v4.init()
        print(v4.list_tasks())
    elif args.cmd == "add-task":
        v4.init()
        print(
            v4.add_task(
                args.category,
                args.subcategory,
                args.url,
                args.country,
                args.platform,
                args.interval,
                args.priority,
            )
        )
    elif args.cmd == "run":
        v4.init()
        print(v4.run_due())
    elif args.cmd == "sources":
        v5.init()
        print(v5.list_sources())
    elif args.cmd == "add-api":
        v5.init()
        print(
            v5.add_source(
                args.name,
                args.base_url,
                args.category,
                args.country,
                args.platform,
                args.interval,
                args.priority,
                args.auth_env,
            )
        )
    elif args.cmd == "test-apis":
        v5.init()
        print(v5.test_all())
    elif args.cmd == "schema":
        print(v5.schema_example())
    elif args.cmd == "analyze":
        v6.init()
        print(v6.full_report())
    elif args.cmd == "demo":
        v6.demo()
        print("Demo-Beobachtungen in v2 Memory gespeichert.")
    elif args.cmd == "demo-trends":
        v7.demo()
        print("Demo-Zeitreihen in v2 Memory gespeichert.")
    elif args.cmd == "trends":
        v7.init()
        print(v7.report())
    elif args.cmd == "sync-categories":
        v8.init()
        count = v8.sync_known_categories()
        print(f"{count} bekannte Buzzard-Kategorien synchronisiert.")
    elif args.cmd == "demo-discovery":
        v8.init()
        v8.sync_known_categories()
        v8.demo()
        print("Demo-Kategorie-Signale gespeichert.")
    elif args.cmd == "discover":
        v8.init()
        print(v8.report())
    elif args.cmd == "add-category":
        v8.init()
        print(
            v8.add_candidate(
                args.name,
                args.parent,
                args.level,
                args.source,
                args.confidence,
            )
        )
    elif args.cmd == "refresh-alerts":
        count = v9.refresh_alerts()
        print(f"{count} aktive Warnungen aktualisiert.")
    elif args.cmd == "intel-report":
        v9.init()
        print(v9.report())
    elif args.cmd == "alerts":
        v9.init()
        print(v9.alerts())
    elif args.cmd == "queue":
        v9.init()
        print(v9.priority_queue())
    elif args.cmd == "demo-reporting":
        count = v9.demo()
        print(f"Demo-Daten geladen, {count} Warnungen erzeugt.")
    elif args.cmd == "inbox":
        v10.init()
        print(v10.inbox())
    elif args.cmd == "council-board":
        v10.init()
        print(v10.council_board())
    elif args.cmd == "demo-council":
        v10.init()
        v10.demo()
        print("Demo-Intelligence-Ereignisse erstellt.")
    elif args.cmd == "sync-council":
        imported = v10.sync_from_alerts(v9)
        print(f"{imported} Warnungen in den Council-Posteingang übernommen.")
    elif args.cmd == "council-event":
        v10.init()
        print(
            v10.create_event(
                args.type,
                args.title,
                args.details,
                args.source,
                args.priority,
                args.from_agent,
            )
        )
    elif args.cmd == "council-assign":
        v10.init()
        print(v10.assign(args.event_id, args.agent))
    elif args.cmd == "council-review":
        v10.init()
        print(v10.review(args.event_id, args.decision, args.note, args.agent))
    elif args.cmd == "voice":
        from voice.server import main as voice_main

        print(f"Voice interface: http://{args.host}:{args.port}")
        voice_main(host=args.host, port=args.port)
    elif args.cmd == "remember":
        v12.init()
        print(
            v12.add(
                args.type,
                args.text,
                args.source,
                args.confidence,
                args.tags,
                args.entity,
            )
        )
    elif args.cmd == "recall":
        v12.init()
        print(v12.search(args.query))
    elif args.cmd == "shared-timeline":
        v12.init()
        print(v12.timeline())
    elif args.cmd == "memory-status":
        v12.init()
        print(v12.update_status(args.id, args.status, args.actor))
    elif args.cmd == "shared-link":
        v12.init()
        print(v12.link(args.from_id, args.to_id, args.relation))
    elif args.cmd == "term-add":
        v13.init()
        print(
            v13.add(
                args.language,
                args.text,
                args.canonical,
                args.entity,
                args.source,
                args.confidence,
            )
        )
    elif args.cmd == "ml-demo":
        v13.init()
        v13.demo()
        print("Demo-Mehrsprachdaten gespeichert.")
    elif args.cmd == "ml-report":
        v13.init()
        print(v13.report())
    elif args.cmd == "competitor-add":
        v14.init()
        print(v14.add_competitor(args.name, args.country, args.source))
    elif args.cmd == "competitor-product":
        v14.init()
        print(
            v14.add_product(
                args.competitor,
                args.category,
                args.name,
                args.brand,
                args.price,
                args.currency,
                args.popularity,
                args.source,
            )
        )
    elif args.cmd == "competitor-demo":
        v14.init()
        v14.demo()
        print("Demo-Wettbewerbsdaten gespeichert.")
    elif args.cmd == "competitor-report":
        v14.init()
        print(v14.report())
    elif args.cmd == "trust-product":
        v15.init()
        print(v15.add_product(args.name, args.brand, args.supplier, args.source))
    elif args.cmd == "trust-evidence":
        v15.init()
        print(v15.add_evidence(args.product_id, args.type, args.issuer, args.reference))
    elif args.cmd == "trust-verify":
        v15.init()
        print(v15.verify(args.product_id, args.status, args.note))
    elif args.cmd == "trust-demo":
        v15.init()
        v15.demo()
        print("Demo-Vertrauensdaten gespeichert.")
    elif args.cmd == "trust-report":
        v15.init()
        print(v15.report())
    elif args.cmd == "profit-calc":
        v16.init()
        print(
            v16.calculate(
                args.name,
                args.sale,
                args.cost,
                args.shipping,
                args.marketplace,
                args.payment,
                args.ads,
                args.packaging,
                args.other,
                args.tax,
            )
        )
    elif args.cmd == "profit-demo":
        v16.init()
        v16.demo()
        print("Demo-Rentabilitätsdaten gespeichert.")
    elif args.cmd == "profit-report":
        v16.init()
        print(v16.report())
    elif args.cmd == "market-add":
        v17.init()
        print(
            v17.add_market(
                args.country,
                args.market,
                args.demand,
                args.competition,
                args.logistics,
                args.risk,
            )
        )
    elif args.cmd == "opportunity-add":
        v17.init()
        print(
            v17.add_opportunity(
                args.country,
                args.category,
                args.product,
                args.demand,
                args.competition,
                args.margin,
                args.logistics,
                args.risk,
            )
        )
    elif args.cmd == "market-demo":
        v17.init()
        v17.demo()
        print("Demo-Marktdaten gespeichert.")
    elif args.cmd == "market-report":
        v17.init()
        print(v17.report())
    elif args.cmd == "supplier-add":
        v18.init()
        print(v18.add_supplier(args.name, args.country, args.b2b, args.source))
    elif args.cmd == "supplier-capability":
        v18.init()
        print(
            v18.add_capability(
                args.supplier,
                args.capability,
                args.status,
                args.evidence,
            )
        )
    elif args.cmd == "supplier-demo":
        v18.init()
        v18.demo()
        print("Demo-Lieferantendaten gespeichert.")
    elif args.cmd == "supplier-report":
        v18.init()
        print(v18.report())
    elif args.cmd == "risk-add":
        v19.init()
        print(
            v19.add_risk(
                args.entity,
                args.type,
                args.severity,
                args.details,
                args.source,
                args.country,
            )
        )
    elif args.cmd == "risk-verify":
        v19.init()
        print(v19.verify(args.risk_id, args.status, args.note, args.reviewer))
    elif args.cmd == "risk-demo":
        v19.init()
        v19.demo()
        print("Demo-Risikodaten gespeichert.")
    elif args.cmd == "risk-report":
        v19.init()
        print(v19.report())
    elif args.cmd == "orch-create":
        v20.init()
        print(
            v20.create_task(
                args.title,
                args.details,
                args.priority,
                args.created_by,
            )
        )
    elif args.cmd == "orch-assign":
        v20.init()
        print(v20.assign(args.task_id, args.agent))
    elif args.cmd == "orch-opinion":
        v20.init()
        print(
            v20.add_opinion(
                args.task_id,
                args.agent,
                args.decision,
                args.confidence,
                args.note,
            )
        )
    elif args.cmd == "orch-demo":
        v20.init()
        v20.demo()
        print("Demo-Council-Orchestrierung gespeichert.")
    elif args.cmd == "orch-board":
        v20.init()
        print(v20.board())
    elif args.cmd == "ai-add-provider":
        v21.init()
        print(
            v21.add_provider(
                args.name,
                args.base_url,
                args.model,
                args.api_key_env,
            )
        )
    elif args.cmd == "ai-providers":
        v21.init()
        print(v21.providers())
    elif args.cmd == "ai-demo":
        v21.init()
        print(v21.demo())
    elif args.cmd == "research-create":
        v22.init()
        print(v22.create_research(args.query, args.purpose))
    elif args.cmd == "research-source":
        v22.init()
        print(v22.add_source(args.research_id, args.url, args.title, args.domain))
    elif args.cmd == "research-finding":
        v22.init()
        print(
            v22.add_finding(
                args.research_id,
                args.source_id,
                args.claim,
                args.confidence,
                args.note,
            )
        )
    elif args.cmd == "research-demo":
        v22.init()
        v22.demo()
        print("Demo-Forschungsdaten gespeichert.")
    elif args.cmd == "research-report":
        v22.init()
        print(v22.report())
    elif args.cmd == "collect":
        v3.init()
        print(v3.collect(args.url, args.category, args.subcategory, args.country, args.platform))
    elif args.cmd == "collect-list":
        v3.init()
        urls = [
            line.strip()
            for line in Path(args.file).read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.lstrip().startswith("#")
        ]
        for result in v3.collect_list(urls, args.category, args.subcategory, args.country, args.platform):
            print(result)
    elif args.cmd == "add-observation":
        v2.init()
        result = v2.observe(
            args.category,
            args.subcategory,
            args.subsubcategory,
            args.product,
            args.brand,
            args.platform,
            args.country,
            args.price,
            args.currency,
            args.popularity,
            args.source_url,
            args.source_name,
            args.confidence,
        )
        print(result)
    elif args.cmd == "report":
        v1.init()
        print(v1.report())
    elif args.cmd == "report-v2":
        v2.init()
        print(v2.report())
    elif args.cmd == "changes":
        v2.init()
        print(v2.changes())
    elif args.cmd == "memory":
        v2.init()
        print(v2.search_memory(args.query))
    elif args.cmd == "export-memory":
        v2.init()
        path = v2.export_json()
        print(f"Memory exported to {path}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
