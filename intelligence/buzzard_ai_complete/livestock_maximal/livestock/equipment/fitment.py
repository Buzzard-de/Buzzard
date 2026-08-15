class LivestockEquipmentFitment:
    """
    Equipment compatibility is for machines/farm equipment, not medical
    diagnosis or treatment. Source and confidence must be retained.
    """
    def __init__(self, profiles=None, fitments=None):
        self.profiles=profiles or []
        self.fitments=fitments or []

    def find_equipment(self, equipment_type=None, make=None, model=None):
        rows=self.profiles
        if equipment_type: rows=[x for x in rows if x.equipment_type.lower()==equipment_type.lower()]
        if make: rows=[x for x in rows if x.make and x.make.lower()==make.lower()]
        if model: rows=[x for x in rows if x.model and x.model.lower()==model.lower()]
        return rows

    def compatible_parts(self, equipment_id):
        return [x for x in self.fitments if x.equipment_id==equipment_id]
