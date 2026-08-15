def landed_shipping_cost(base_rate, surcharge=0, packaging=0, insurance=0):
    return round(float(base_rate) + float(surcharge) + float(packaging) + float(insurance), 2)
