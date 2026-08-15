def validate_event(event):
    required = ("event_id", "event_type", "timestamp")
    missing = [field for field in required if not getattr(event, field, None)]
    if event.value < 0 or event.cost < 0:
        missing.append("negative_value_or_cost")
    return missing
