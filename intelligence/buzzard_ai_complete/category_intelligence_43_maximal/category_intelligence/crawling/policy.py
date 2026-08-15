class PublicWebPolicy:
    """
    Policy gate for lawful public-source monitoring.
    It does not bypass robots.txt, authentication, CAPTCHAs, paywalls,
    access controls, rate limits, or private data boundaries.
    """
    def allow(self, url, robots_allowed=True, authenticated=False,
              captcha=False, private_area=False):
        if not robots_allowed:
            return False, "robots_disallow"
        if authenticated or captcha or private_area:
            return False, "restricted_area"
        return True, "allowed_public_source"
