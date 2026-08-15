class RestrictionSource:
    def check(self, profile, destination):
        if profile.restricted:
            return {"restricted": True, "status": "restricted", "human_review_required": True}
        return {"restricted": False, "status": "clear", "human_review_required": False}


class OriginSource:
    def check(self, profile, destination):
        if not profile.origin_country:
            return {"status": "origin_missing", "human_review_required": True}
        return {"status": "origin_provided_requires_verification", "human_review_required": True}
