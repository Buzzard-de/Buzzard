class ConstructionFitmentEngine:
    def __init__(self, machines=None, fitments=None):
        self.machines = machines or []
        self.fitments = fitments or []

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
