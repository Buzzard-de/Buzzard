#!/usr/bin/env python3
import argparse
from pathlib import Path

from buzzard_intelligence import (
    APILayer,
    Analyzer,
    CategoryDiscovery,
    Collector,
    IntelligenceDB,
    MemoryEngine,
    Scheduler,
    SEED_CATEGORIES,
    TrendEngine,
)


def main():
    parser = argparse.ArgumentParser(
        description="Buzzard Intelligence v1–v8 (Memory, Collector, Scheduler, API, Analysis, Trends, Discovery)"
    )
    sub = parser.add_subparsers(dest="cmd")

    sub.add_parser("init", help="Create v1 + v2 + v4 + v5 SQLite schemas")
    sub.add_parser("init-v1", help="Create v1 SQLite schema only")
    sub.add_parser("init-v2", help="Create v2 memory schema only")
    sub.add_parser("init-v4", help="Create v4 scheduler schema only")
    sub.add_parser("init-v5", help="Create v5 API layer schema only")
    sub.add_parser("init-v8", help="Create v8 category discovery schema only")
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

    if args.cmd == "init":
        v1.init()
        v2.init()
        v4.init()
        v5.init()
        v8.init()
        print(f"v1 database ready at {Path(v1.path).resolve()}")
        print(f"v2 memory engine ready at {Path(v2.path).resolve()}")
        print(f"v4 scheduler ready at {Path(v4.path).resolve()}")
        print(f"v5 API layer ready at {Path(v5.path).resolve()}")
        print(f"v8 category discovery ready at {Path(v8.path).resolve()}")
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
