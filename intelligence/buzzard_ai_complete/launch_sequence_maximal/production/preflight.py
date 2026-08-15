REQUIRED = [
    "APP_BASE_URL",
    "APP_DOMAIN",
    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
]


def validate_environment(env):
    missing = [key for key in REQUIRED if not env.get(key)]
    https = str(env.get("APP_BASE_URL", "")).startswith("https://")
    return {
        "passed": not missing and https,
        "missing": missing,
        "https": https,
    }
