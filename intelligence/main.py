#!/usr/bin/env python3
import argparse
from pathlib import Path

from buzzard_intelligence import IntelligenceDB, MemoryEngine, SEED_CATEGORIES


def main():
    parser = argparse.ArgumentParser(description="Buzzard Intelligence v1 + v2 Memory")
    sub = parser.add_subparsers(dest="cmd")

    sub.add_parser("init", help="Create v1 + v2 SQLite schemas")
    sub.add_parser("init-v1", help="Create v1 SQLite schema only")
    sub.add_parser("init-v2", help="Create v2 memory schema only")
    sub.add_parser("seed", help="Seed legacy TR main categories (v1 + v2)")
    sub.add_parser("seed-de", help="Seed 41 German Buzzard main categories (v1 + v2)")
    sub.add_parser("report", help="v1 summary report")
    sub.add_parser("report-v2", help="v2 memory summary report")
    sub.add_parser("changes", help="v2 detected changes (price, popularity, discoveries)")
    sub.add_parser("export-memory", help="Export v2 memory snapshot to JSON")

    memory = sub.add_parser("memory", help="Search v2 memory by product, brand, or category")
    memory.add_argument("query")

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

    if args.cmd == "init":
        v1.init()
        v2.init()
        print(f"v1 database ready at {Path(v1.path).resolve()}")
        print(f"v2 memory engine ready at {Path(v2.path).resolve()}")
    elif args.cmd == "init-v1":
        v1.init()
        print(f"v1 database ready at {Path(v1.path).resolve()}")
    elif args.cmd == "init-v2":
        v2.init()
        print(f"v2 memory engine ready at {Path(v2.path).resolve()}")
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
