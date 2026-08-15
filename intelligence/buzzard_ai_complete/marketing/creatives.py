class CreativeRegistry:
    def __init__(self):
        self.items = {}

    def add(self, creative_id, title, channel, assets=None):
        self.items[creative_id] = {"title": title, "channel": channel, "assets": assets or []}
        return self.items[creative_id]

    def get(self, creative_id):
        return self.items.get(creative_id)
