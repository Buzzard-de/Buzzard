class CustomsDocumentChecklist:
    BASE = ["commercial_invoice", "packing_list", "transport_document"]

    def required(self, route, profile):
        docs = list(self.BASE)
        if route.destination and route.destination != route.origin:
            docs.append("customs_declaration")
        if profile.origin_country:
            docs.append("origin_evidence")
        if profile.licenses:
            docs.extend(profile.licenses)
        return sorted(set(docs))
