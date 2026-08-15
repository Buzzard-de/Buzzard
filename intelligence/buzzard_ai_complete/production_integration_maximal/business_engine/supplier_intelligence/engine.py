class SupplierIntelligence:
    def score(self, metrics):
        weights={"price":0.20,"availability":0.25,"delivery":0.20,"quality":0.20,"returns":0.15}
        return round(sum(float(metrics.get(k,0))*w for k,w in weights.items()),2)
    def rank(self, suppliers):
        return sorted(
            [{"supplier":k,"score":self.score(v)} for k,v in suppliers.items()],
            key=lambda x:x["score"], reverse=True
        )
