import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


class BuzzardMasterTaxonomy:
    def __init__(self, path=None):
        taxonomy_path = Path(path or DATA_DIR / "taxonomy.json")
        self.data = json.loads(taxonomy_path.read_text(encoding="utf-8"))
        self.nodes = self.data["nodes"]

    def counts(self):
        return {
            "main_categories": sum(n["level"] == 1 for n in self.nodes),
            "subcategories": sum(n["level"] == 2 for n in self.nodes),
            "sub_subcategories": sum(n["level"] == 3 for n in self.nodes),
            "total_nodes": len(self.nodes),
        }

    def children(self, parent_id):
        return [n for n in self.nodes if n["parent_id"] == parent_id]

    def search(self, term):
        q = term.casefold()
        return [n for n in self.nodes if q in n["name"].casefold()]

    def validate(self):
        ids = [n["id"] for n in self.nodes]
        assert len(ids) == len(set(ids))
        by_id = {n["id"]: n for n in self.nodes}
        for node in self.nodes:
            if node["level"] == 1:
                assert node["parent_id"] is None
            else:
                assert node["parent_id"] in by_id
                assert by_id[node["parent_id"]]["level"] == node["level"] - 1
        return True
