class SocialPlatformAdapter:
    platform = "generic"

    def collect(self, source_config):
        raise NotImplementedError

    def normalize(self, raw_items):
        raise NotImplementedError

    def health(self):
        return {"platform": self.platform, "status": "not_configured"}
