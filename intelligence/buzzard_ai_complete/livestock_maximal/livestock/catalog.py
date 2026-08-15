class LivestockCatalog:
    def __init__(self, taxonomy):
        self.taxonomy=taxonomy

    def subcategories(self, category):
        return self.taxonomy.get(category,{}).get("subcategories",{})

    def sub_subcategories(self, category, subcategory):
        return (self.taxonomy.get(category,{}).get("subcategories",{})
                .get(subcategory,{}).get("sub_sub",[]))

    def search(self, keyword):
        q=keyword.lower()
        hits=[]
        for ck,c in self.taxonomy.items():
            if q in c["name"].lower():
                hits.append((ck,c["name"]))
            for sk,s in c["subcategories"].items():
                if q in s["name"].lower():
                    hits.append((f"{ck}/{sk}",s["name"]))
                for x in s["sub_sub"]:
                    if q in x.lower():
                        hits.append((f"{ck}/{sk}/{x}",x))
        return hits
