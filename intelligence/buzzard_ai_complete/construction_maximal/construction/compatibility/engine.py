from buzzard_ai_complete.construction_maximal.construction.models import (
    ConstructionMachine,
    ConstructionPart,
    FitmentResult,
)


class ConstructionFitmentEngine:
    """
    Conservative machine/part compatibility:
    missing evidence => unknown; conflicting evidence => review.
    """

    def __init__(self, machines=None, fitments=None):
        self.machines = machines or []
        self.fitments = fitments or []

    def match(self, machine: ConstructionMachine, part: ConstructionPart) -> FitmentResult:
        attrs = part.attributes
        checks = []
        reasons = []
        for key in ("machine_type", "make", "model", "engine_code"):
            if key in attrs and getattr(machine, key, None):
                ok = str(attrs[key]).casefold() == str(getattr(machine, key)).casefold()
                checks.append(ok)
                reasons.append(f"{key}={'match' if ok else 'mismatch'}")
        if not checks:
            return FitmentResult("unknown", 0.0, ["yeterli uyumluluk kanıtı yok"])
        confidence = sum(checks) / len(checks)
        if all(checks):
            return FitmentResult("compatible", confidence, reasons)
        return FitmentResult("review", confidence, reasons)

    def select_machine(self, machine_type=None, make=None, model=None, year=None):
        rows = self.machines
        if machine_type:
            rows = [x for x in rows if x.machine_type.lower() == machine_type.lower()]
        if make:
            rows = [x for x in rows if x.make and x.make.lower() == make.lower()]
        if model:
            rows = [x for x in rows if x.model and x.model.lower() == model.lower()]
        if year is not None:
            rows = [
                x for x in rows
                if (x.year_from is None or year >= x.year_from)
                and (x.year_to is None or year <= x.year_to)
            ]
        return rows

    def compatible_parts(self, machine_id, system=None):
        return [
            x for x in self.fitments
            if x.machine_id == machine_id and (not system or x.position == system)
        ]
