from statistics import mean, median

class PriceIntelligenceEngine:
    def normalize(self, offer):
        shipping = float(offer.shipping_price or 0)
        return {
            "seller_id": offer.seller_id,
            "seller_name": offer.seller_name,
            "product_key": offer.product_key,
            "price": float(offer.price),
            "shipping": shipping,
            "landed_public_price": float(offer.price) + shipping,
            "currency": offer.currency,
            "observed_at": offer.observed_at,
        }

    def summarize(self, offers):
        rows = [self.normalize(x) for x in offers if x.price is not None]
        prices = [x["landed_public_price"] for x in rows]
        if not prices:
            return {"count": 0, "unique_sellers": 0}
        return {
            "count": len(rows),
            "unique_sellers": len({x["seller_id"] for x in rows}),
            "min": min(prices),
            "max": max(prices),
            "mean": round(mean(prices), 2),
            "median": round(median(prices), 2),
        }

    def seller_comparison(self, offers):
        rows = self.summarize(offers)
        by_product = {}
        for x in offers:
            key = x.product_key
            by_product.setdefault(key, []).append(self.normalize(x))
        comparisons = []
        for key, vals in by_product.items():
            vals.sort(key=lambda x: x["landed_public_price"])
            comparisons.append({
                "product_key": key,
                "lowest": vals[0],
                "highest": vals[-1],
                "seller_count": len(vals)
            })
        return {"summary": rows, "products": comparisons}

    def detect_price_changes(self, previous, current, threshold_pct=2.0):
        old = {x.product_key: x for x in previous}
        changes = []
        for x in current:
            if x.product_key not in old:
                continue
            before = self.normalize(old[x.product_key])["landed_public_price"]
            after = self.normalize(x)["landed_public_price"]
            if before == 0:
                continue
            pct = (after - before) / before * 100
            if abs(pct) >= threshold_pct:
                changes.append({
                    "product_key": x.product_key,
                    "before": before,
                    "after": after,
                    "change_pct": round(pct, 2),
                    "direction": "up" if pct > 0 else "down"
                })
        return changes
