def recommend_action(roas, target_roas=3.0):
    if roas <= 0:
        return "PAUSE_AND_INVESTIGATE"
    if roas < target_roas * 0.7:
        return "REDUCE_OR_PAUSE"
    if roas < target_roas:
        return "OPTIMIZE"
    return "SCALE_CAUTIOUSLY"
