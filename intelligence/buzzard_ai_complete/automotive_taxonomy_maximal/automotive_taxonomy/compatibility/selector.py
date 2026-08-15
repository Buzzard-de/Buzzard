class VehicleSelector:
    def __init__(self, vehicles):
        self.vehicles=vehicles

    def select(self, make=None, model=None, year=None, engine=None,
               engine_code=None, fuel=None, body=None):
        rows=self.vehicles
        if make: rows=[v for v in rows if v.make.lower()==make.lower()]
        if model: rows=[v for v in rows if v.model.lower()==model.lower()]
        if year is not None:
            rows=[v for v in rows if
                  (v.year_from is None or year>=v.year_from) and
                  (v.year_to is None or year<=v.year_to)]
        if engine: rows=[v for v in rows if v.engine and engine.lower() in v.engine.lower()]
        if engine_code: rows=[v for v in rows if v.engine_code and v.engine_code.lower()==engine_code.lower()]
        if fuel: rows=[v for v in rows if v.fuel and v.fuel.lower()==fuel.lower()]
        if body: rows=[v for v in rows if v.body and v.body.lower()==body.lower()]
        return rows
