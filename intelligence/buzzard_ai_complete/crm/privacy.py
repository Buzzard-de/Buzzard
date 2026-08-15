MARKETING_FIELDS = {"email_marketing", "sms_marketing", "profiling"}


def marketing_allowed(consent, channel):
    return bool(consent.get(channel, False))


def redact_profile(profile):
    data = dict(profile)
    if "email" in data:
        data["email"] = "[REDACTED]"
    return data
