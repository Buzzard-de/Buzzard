from buzzard_ai_complete.logistics.models import Parcel


def validate_parcel(parcel: Parcel):
    errors = []
    if parcel.weight_kg <= 0:
        errors.append("weight_must_be_positive")
    if min(parcel.length_cm, parcel.width_cm, parcel.height_cm) <= 0:
        errors.append("dimensions_must_be_positive")
    if parcel.weight_kg > 100:
        errors.append("weight_exceeds_default_limit")
    return errors
