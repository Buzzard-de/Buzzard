from .base import SocialPlatformAdapter

class RedditAdapter(SocialPlatformAdapter):
    platform = "reddit"

    def collect(self, source_config):
        # Provider-neutral contract. Real API/feed implementation is injected
        # only after authorized credentials and platform terms are configured.
        return {"status":"not_configured","platform":"reddit","source":source_config}

    def normalize(self, raw_items):
        return raw_items

    def health(self):
        return {"platform":"reddit","status":"ready_for_authorized_connector"}
