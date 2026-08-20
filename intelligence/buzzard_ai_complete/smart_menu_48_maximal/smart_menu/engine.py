import json
from pathlib import Path

from buzzard_ai_complete.shared.master_l1_names import overlay_main_category

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


class SmartMegaMenuEngine:
    def __init__(self, path=None):
        taxonomy_path = Path(path or DATA_DIR / "taxonomy.json")
        self.data = json.loads(taxonomy_path.read_text(encoding="utf-8"))
        self.nodes = self.data["nodes"]

    def counts(self):
        subcategories = sum(len(main["children"]) for main in self.nodes)
        sub_subcategories = sum(
            len(sub["children"]) for main in self.nodes for sub in main["children"]
        )
        return {
            "main_categories": len(self.nodes),
            "subcategories": subcategories,
            "sub_subcategories": sub_subcategories,
            "total_nodes": len(self.nodes) + subcategories + sub_subcategories,
        }

    def signal_counts(self):
        subs_with_signals = 0
        popular = 0
        brands = 0
        products = 0
        for main in self.nodes:
            for sub in main["children"]:
                signals = sub.get("signals")
                if not signals:
                    continue
                subs_with_signals += 1
                popular += len(signals.get("popular", []))
                brands += len(signals.get("brands", []))
                products += len(signals.get("products", []))
        return {
            "subcategories_with_signals": subs_with_signals,
            "popular_entries": popular,
            "brand_entries": brands,
            "product_entries": products,
        }

    def main_categories(self):
        return [
            {
                "id": node["id"],
                "name": overlay_main_category(node)["name"],
                "slug": overlay_main_category(node)["slug"],
            }
            for node in self.nodes
        ]

    def get_main(self, main_id):
        for node in self.nodes:
            if node["id"] == main_id:
                return overlay_main_category(node)
        return None

    def get_subcategory(self, sub_id):
        for main in self.nodes:
            for sub in main["children"]:
                if sub["id"] == sub_id:
                    return {"main": main, "sub": sub}
        return None

    def get_signals(self, sub_id):
        match = self.get_subcategory(sub_id)
        if match is None:
            return None
        return match["sub"].get("signals", {})

    def search(self, term, limit=250):
        query = term.strip().casefold()
        if not query:
            return []
        results = []
        for main in self.nodes:
            for sub in main["children"]:
                for leaf in sub["children"]:
                    haystack = f"{main['name']} {sub['name']} {leaf['name']}".casefold()
                    if query in haystack:
                        results.append(
                            {
                                "main": {
                                    "id": main["id"],
                                    "name": main["name"],
                                    "slug": main["slug"],
                                },
                                "sub": {
                                    "id": sub["id"],
                                    "name": sub["name"],
                                    "slug": sub["slug"],
                                },
                                "leaf": {
                                    "id": leaf["id"],
                                    "name": leaf["name"],
                                    "slug": leaf["slug"],
                                },
                            }
                        )
                        if len(results) >= limit:
                            return results
        return results

    def validate(self):
        counts = self.counts()
        assert counts["main_categories"] == 48
        assert counts["subcategories"] == 796
        assert counts["sub_subcategories"] == 6411
        signal_counts = self.signal_counts()
        assert signal_counts["subcategories_with_signals"] == 796
        ids = set()

        def walk(node, expect_signals=False):
            assert node["id"] not in ids
            ids.add(node["id"])
            assert "name" in node and "slug" in node
            if expect_signals:
                signals = node.get("signals", {})
                assert "popular" in signals and signals["popular"]
                assert "brands" in signals and signals["brands"]
                assert "products" in signals and signals["products"]
            for child in node.get("children", []):
                walk(child, expect_signals=bool(child.get("children")))

        for main in self.nodes:
            for sub in main["children"]:
                walk(sub, expect_signals=True)
        return True
