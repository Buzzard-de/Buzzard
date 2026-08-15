class AgricultureCatalogService:
    def __init__(self, taxonomy):
        self.taxonomy=taxonomy

    def list_subcategories(self, category_key):
        return self.taxonomy.get(category_key, {}).get("subcategories", {})

    def list_sub_subcategories(self, category_key, sub_key):
        return (
            self.taxonomy.get(category_key, {})
            .get("subcategories", {})
            .get(sub_key, {})
            .get("sub_sub", [])
        )

    def find_category(self, keyword):
        q=keyword.lower()
        hits=[]
        for key,val in self.taxonomy.items():
            if q in val["name"].lower() or q in key.lower():
                hits.append((key,val["name"]))
            for sk,sv in val["subcategories"].items():
                if q in sv["name"].lower():
                    hits.append((f"{key}/{sk}",sv["name"]))
                for sss in sv["sub_sub"]:
                    if q in sss.lower():
                        hits.append((f"{key}/{sk}/{sss}",sss))
        return hits
