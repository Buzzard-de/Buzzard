SENSITIVE_FIELDS = {"email", "phone", "address", "payment_reference"}


def redact_customer(customer_dict):
    result = dict(customer_dict)
    for field in SENSITIVE_FIELDS:
        if field in result:
            result[field] = "[REDACTED]"
    return result
