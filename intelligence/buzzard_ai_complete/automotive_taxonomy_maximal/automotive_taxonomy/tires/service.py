from .taxonomy import TIRE_TAXONOMY

class TireIntelligence:
    def categories(self):
        return TIRE_TAXONOMY

    def search(self, vehicle_type=None, season=None, width=None, aspect=None,
               rim=None, load_index=None, speed_index=None, use=None):
        # Provider-neutral search contract. Product inventory is injected by PIM.
        return {
            "filters":{
                "vehicle_type":vehicle_type,"season":season,"width_mm":width,
                "aspect_ratio":aspect,"rim_inch":rim,"load_index":load_index,
                "speed_index":speed_index,"use":use
            },
            "catalog_source":"Buzzard PIM / verified fitment data"
        }

    def validate_size(self, width, aspect, rim):
        if not all(x is not None for x in [width,aspect,rim]):
            return {"valid":False,"reason":"size_incomplete"}
        if width<=0 or aspect<=0 or rim<=0:
            return {"valid":False,"reason":"invalid_numeric_size"}
        return {"valid":True,"size":f"{width}/{aspect} R{rim:g}"}
