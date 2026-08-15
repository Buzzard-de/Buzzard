class FitmentConnector:
    """
    Provider-neutral import contract. Production adapters can be connected
    to licensed TecDoc, OEM catalogs, supplier APIs/XML feeds, etc.
    """
    def fetch(self, query):
        raise NotImplementedError

class TecDocConnector(FitmentConnector):
    def fetch(self, query):
        return {"status":"connector_required","provider":"TecDoc","query":query}

class SupplierFeedConnector(FitmentConnector):
    def fetch(self, query):
        return {"status":"connector_required","provider":"supplier_feed","query":query}

class OEMCatalogConnector(FitmentConnector):
    def fetch(self, query):
        return {"status":"connector_required","provider":"OEM","query":query}
