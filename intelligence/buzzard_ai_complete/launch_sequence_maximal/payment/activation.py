REQUIRED_KEYS = {"provider", "merchant_account", "webhook_secret"}


def validate_payment_config(config):
    missing = [key for key in REQUIRED_KEYS if not config.get(key)]
    return {
        "passed": not missing,
        "missing": missing,
        "status": "configured" if not missing else "not_configured",
    }
