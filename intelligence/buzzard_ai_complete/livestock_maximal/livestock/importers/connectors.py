class LivestockConnector:
    def fetch(self, query):
        raise NotImplementedError

class SupplierAPIConnector(LivestockConnector):
    def fetch(self, query):
        return {"status":"connector_required","provider":"supplier_api_xml","query":query}

class OEMEquipmentConnector(LivestockConnector):
    def fetch(self, query):
        return {"status":"connector_required","provider":"OEM_equipment","query":query}

class FarmEquipmentCatalogConnector(LivestockConnector):
    def fetch(self, query):
        return {"status":"connector_required","provider":"licensed_equipment_catalog","query":query}
