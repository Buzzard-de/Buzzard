class SocialProductDiscovery:
    def discover(self, posts, known_products, known_categories):
        known_products={x.strip().lower() for x in known_products}
        known_categories={x.strip().lower() for x in known_categories}
        candidates=[]
        for p in posts:
            topic=(p.get("topic") or "").strip()
            if not topic: continue
            low=topic.lower()
            if low not in known_products and low not in known_categories:
                candidates.append({
                    "topic":topic,
                    "reason":"observed_public_social_topic_not_in_current_catalog",
                    "platform":p.get("platform"),
                    "confidence":min(1.0,0.5+0.05*len(p.get("platforms",[])))
                })
        return candidates
