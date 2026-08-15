class CustomsRulesEngine:
    def __init__(self, restriction_source, origin_source):
        self.restriction_source = restriction_source
        self.origin_source = origin_source

    def classify(self, profile):
        if not profile.cn_code and not profile.hs_code and not profile.taric_code:
            return {"status": "classification_required", "code": None, "confidence": 0.0}
        code = profile.taric_code or profile.cn_code or profile.hs_code
        return {"status": "provided_code_requires_verification", "code": code, "confidence": 0.5}

    def restrictions(self, profile, destination):
        return self.restriction_source.check(profile, destination)

    def origin(self, profile, destination):
        return self.origin_source.check(profile, destination)
