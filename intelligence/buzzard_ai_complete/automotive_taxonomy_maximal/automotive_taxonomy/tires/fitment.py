class TireFitmentEngine:
    def __init__(self, fitments=None):
        self.fitments=fitments or []

    def compatible(self, vehicle, size=None, axle=None, position=None):
        rows=[]
        for f in self.fitments:
            if f.vehicle_type != vehicle.get("vehicle_type"):
                continue
            if f.make and f.make.lower()!=vehicle.get("make","").lower():
                continue
            if f.model and f.model.lower()!=vehicle.get("model","").lower():
                continue
            year=vehicle.get("year")
            if year is not None and f.year_from and year < f.year_from: continue
            if year is not None and f.year_to and year > f.year_to: continue
            if axle and f.axle and f.axle!=axle: continue
            if position and f.position and f.position!=position: continue
            rows.append(f)
        return rows
