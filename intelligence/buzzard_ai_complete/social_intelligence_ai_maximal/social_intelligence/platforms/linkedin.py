from .base import SocialPlatformAdapter

class LinkedInAdapter(SocialPlatformAdapter):
    platform = "linkedin"

    def collect(self, source_config):
        # Provider-neutral contract. Real API/feed implementation is injected
        # only after authorized credentials and platform terms are configured.
        return {"status":"not_configured","platform":"linkedin","source":source_config}

    def normalize(self, raw_items):
        return raw_items

    def health(self):
        return {"platform":"linkedin","status":"ready_for_authorized_connector"}
