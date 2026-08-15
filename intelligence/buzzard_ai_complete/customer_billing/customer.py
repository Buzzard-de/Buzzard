class CustomerRegistry:
    def __init__(self):
        self.customers = {}

    def upsert(self, customer):
        if not customer.customer_id or not customer.email:
            raise ValueError("customer_id_and_email_required")
        self.customers[customer.customer_id] = customer
        return customer

    def get(self, customer_id):
        return self.customers.get(customer_id)

    def add_address(self, customer_id, address):
        customer = self.get(customer_id)
        if customer is None:
            raise KeyError("customer_not_found")
        customer.addresses.append(dict(address))
        return customer
