class ConstructionCatalog:
    def __init__(self, taxonomy):
        self.taxonomy = taxonomy

    def sub_subcategories(self, category_key):
        return self.taxonomy.get(category_key, {}).get("sub_sub", [])

    def search(self, keyword):
        q = keyword.casefold()
        hits = []
        for key, value in self.taxonomy.items():
            if q in value["name"].casefold() or q in key.casefold():
                hits.append((key, value["name"]))
            for leaf in value.get("sub_sub", []):
                if q in leaf.casefold():
                    hits.append((f"{key}/{leaf}", leaf))
        return hits
