def detect_spike(current, baseline, multiplier=2.0):
    if baseline <= 0:
        return False
    return current >= baseline * multiplier


def detect_drop(current, baseline, ratio=0.5):
    if baseline <= 0:
        return False
    return current <= baseline * ratio
