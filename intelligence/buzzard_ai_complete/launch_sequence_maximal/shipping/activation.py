REQUIRED = {"carrier", "account_id", "api_credential"}


def validate_shipping_config(config):
    missing = [key for key in REQUIRED if not config.get(key)]
    return {
        "passed": not missing,
        "missing": missing,
        "status": "configured" if not missing else "not_configured",
    }
