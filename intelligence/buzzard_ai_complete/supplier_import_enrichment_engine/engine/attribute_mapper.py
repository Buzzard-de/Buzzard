import re

ALIASES = {
    "colour":"color", "farbe":"color", "couleur":"color", "renk":"color",
    "size":"size", "größe":"size", "taille":"size", "beden":"size",
    "material":"material", "brand":"brand", "marke":"brand",
    "weight":"weight", "gewicht":"weight", "poids":"weight",
    "voltage":"voltage", "spannung":"voltage", "volt":"voltage",
    "power":"power", "leistung":"power"
}

def canonical_key(k):
    x=re.sub(r"\s+","_",str(k).strip().casefold())
    return ALIASES.get(x,x)

def map_attributes(attrs):
    result={}
    conflicts=[]
    for k,v in (attrs or {}).items():
        ck=canonical_key(k)
        if ck in result and result[ck] != v:
            conflicts.append({"attribute":ck,"values":[result[ck],v]})
        else:
            result[ck]=v
    return result, conflicts
