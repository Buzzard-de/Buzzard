class SocialCompetitorIntelligence:
    def analyze(self, public_posts):
        results=[]
        for p in public_posts:
            if p.get("brand_or_seller"):
                results.append({
                    "brand_or_seller":p["brand_or_seller"],
                    "platform":p.get("platform"),
                    "signal":p.get("signal","public_activity"),
                    "evidence_url":p.get("source_url")
                })
        return results
