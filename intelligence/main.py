#!/usr/bin/env python3
import argparse
from pathlib import Path

from buzzard_intelligence import IntelligenceDB, SEED_CATEGORIES


def main():
    parser = argparse.ArgumentParser(description="Buzzard Intelligence v1")
    sub = parser.add_subparsers(dest="cmd")

    sub.add_parser("init", help="Create SQLite schema")
    sub.add_parser("seed", help="Seed 100+ legacy TR main categories")
    sub.add_parser("seed-de", help="Seed 41 German Buzzard main categories")
    sub.add_parser("report", help="Summary report")
    sub.add_parser("changes", help="Recent observations")

    p = sub.add_parser("add-observation", help="Record a sourced product observation")
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

    args = parser.parse_args()
    db = IntelligenceDB()

    if args.cmd == "init":
        db.init()
        print(f"Buzzard Intelligence database ready at {Path(db.path).resolve()}")
    elif args.cmd == "seed":
        db.init()
        db.seed_categories(SEED_CATEGORIES)
        print(f"Seeded {len(SEED_CATEGORIES)} legacy main categories.")
    elif args.cmd == "seed-de":
        db.init()
        count = db.seed_categories_de()
        print(f"Seeded {count} German main categories from Buzzard catalog.")
    elif args.cmd == "add-observation":
        db.init()
        db.add_observation(
            category=args.category,
            subcategory=args.subcategory,
            subsubcategory=args.subsubcategory,
            product=args.product,
            brand=args.brand,
            platform=args.platform,
            country=args.country,
            price=args.price,
            currency=args.currency,
            popularity=args.popularity,
            source_url=args.source_url,
        )
        print("Observation saved.")
    elif args.cmd == "report":
        db.init()
        print(db.report())
    elif args.cmd == "changes":
        db.init()
        print(db.changes())
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
