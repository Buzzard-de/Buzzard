class ConstructionIntelligence:
    def product_opportunity(self, product, market_signal):
        return {
            "product": product,
            "market_signal": market_signal,
            "requires_human_review": False,
        }
