class SocialPublicDataPolicy:
    """
    Public/authorized social intelligence only.
    Never bypass authentication, private-account controls, CAPTCHAs,
    paywalls, rate limits, robots/access controls, or platform restrictions.
    Do not build person-level profiles for sensitive inference.
    Prefer official APIs, licensed feeds, or permitted public sources.
    """

    def allow_source(self, source):
        if source.get("private", False):
            return False, "private_source"
        if source.get("authenticated_area", False):
            return False, "authenticated_area"
        if source.get("captcha_bypass", False):
            return False, "captcha_bypass_not_allowed"
        if source.get("access_control_bypass", False):
            return False, "access_control_bypass_not_allowed"
        if source.get("platform_policy_blocked", False):
            return False, "platform_policy_blocked"
        if not source.get("public_or_authorized", True):
            return False, "not_public_or_authorized"
        return True, "allowed"

    def allow_signal(self, signal):
        # Keep analysis at aggregate/topic/product/category level.
        prohibited = {"sensitive_personal_inference", "doxxing", "private_profile"}
        if signal.get("signal_type") in prohibited:
            return False, "prohibited_signal"
        return True, "allowed"
