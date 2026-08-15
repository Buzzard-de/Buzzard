class AgricultureConnector:
    def fetch(self, query):
        raise NotImplementedError

class SupplierAPIConnector(AgricultureConnector):
    def fetch(self, query):
        return {"status":"connector_required","provider":"supplier_api_xml","query":query}

class OEMCatalogConnector(AgricultureConnector):
    def fetch(self, query):
        return {"status":"connector_required","provider":"OEM","query":query}

class MachinePartsCatalogConnector(AgricultureConnector):
    def fetch(self, query):
        return {"status":"connector_required","provider":"licensed_parts_catalog","query":query}
