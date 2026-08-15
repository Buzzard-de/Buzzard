REQUIRED = {"provider", "phone_number", "credentials", "public_webhook", "media_stream"}


def validate_phone(config):
    missing = [key for key in REQUIRED if not config.get(key)]
    return {
        "passed": not missing,
        "missing": missing,
        "status": "configured" if not missing else "not_configured",
    }
