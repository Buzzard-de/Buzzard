from buzzard_ai_complete.renewable_energy_maximal.renewable_energy.taxonomy.master import RENEWABLE_ENERGY_TAXONOMY

class RenewableEnergyCatalog:
    def __init__(self, taxonomy=RENEWABLE_ENERGY_TAXONOMY):
        self.taxonomy = taxonomy

    def subcategories(self, main_key: str):
        return self.taxonomy.get(main_key, {}).get("subcategories", {})

    def sub_subcategories(self, main_key: str, sub_key: str):
        return self.subcategories(main_key).get(sub_key, {}).get("sub_sub", [])

    def search(self, term: str):
        q = term.casefold()
        hits = []
        for mk, main in self.taxonomy.items():
            if q in main["name"].casefold():
                hits.append((mk, main["name"]))
            for sk, sub in main["subcategories"].items():
                if q in sub["name"].casefold():
                    hits.append((f"{mk}/{sk}", sub["name"]))
                for leaf in sub["sub_sub"]:
                    if q in leaf.casefold():
                        hits.append((f"{mk}/{sk}/{leaf}", leaf))
        return hits
