class PublicCategoryCollector:
    def __init__(self, policy, parser):
        self.policy = policy
        self.parser = parser

    def collect(self, source):
        allowed, reason = self.policy.allow(
            source["url"],
            robots_allowed=source.get("robots_allowed", True),
            authenticated=source.get("authenticated", False),
            captcha=source.get("captcha", False),
            private_area=source.get("private_area", False)
        )
        if not allowed:
            return {"status": "skipped", "reason": reason, "url": source["url"]}
        html = source["fetch"]()
        return {
            "status": "ok",
            "url": source["url"],
            "offers": self.parser.parse_offers(html),
            "taxonomy": self.parser.parse_taxonomy(html)
        }
