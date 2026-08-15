def moving_average(values, window=3):
    values = list(values)
    if not values:
        return 0.0
    window = max(1, min(window, len(values)))
    return round(sum(values[-window:]) / window, 2)


def forecast_next(values, window=3):
    return moving_average(values, window)
