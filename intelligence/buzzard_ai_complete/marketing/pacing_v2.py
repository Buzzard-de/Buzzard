def budget_pacing(spend, elapsed_ratio, total_budget):
    if total_budget < 0 or elapsed_ratio <= 0 or elapsed_ratio > 1:
        raise ValueError("invalid_pacing_inputs")
    expected = total_budget * elapsed_ratio
    return {
        "expected_spend": round(expected, 2),
        "actual_spend": round(spend, 2),
        "variance": round(spend - expected, 2),
        "status": (
            "OVER_PACE"
            if spend > expected * 1.10
            else "UNDER_PACE"
            if spend < expected * 0.90
            else "ON_PACE"
        ),
    }
