class ConstructionConnector:
    def fetch(self, query):
        raise NotImplementedError("Configure a production supplier connector.")

class SupplierAPIConnector(ConstructionConnector):
    def fetch(self, query):
        return {"status": "connector_required", "provider": "supplier_api_xml", "query": query}

class OEMCatalogConnector(ConstructionConnector):
    def fetch(self, query):
        return {"status": "connector_required", "provider": "OEM", "query": query}
