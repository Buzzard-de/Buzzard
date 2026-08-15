REQUIRED = {"channel", "seller_account", "api_credentials"}


def validate_channel(config):
    missing = [key for key in REQUIRED if not config.get(key)]
    return {
        "passed": not missing,
        "missing": missing,
        "status": "configured" if not missing else "not_configured",
    }
