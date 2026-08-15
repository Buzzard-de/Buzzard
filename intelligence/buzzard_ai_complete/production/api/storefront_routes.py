try:
    from fastapi import APIRouter, HTTPException
    from pydantic import BaseModel, Field
except ImportError:
    APIRouter = None

from buzzard_ai_complete.production.catalog import Product
from buzzard_ai_complete.production.checkout import CheckoutEngine
from buzzard_ai_complete.production.pricing import PricingGuard
from buzzard_ai_complete.production.catalog import Catalog

if APIRouter:
    router = APIRouter(prefix="/storefront", tags=["storefront"])
    catalog = Catalog()
    pricing = PricingGuard()
    checkout = CheckoutEngine(catalog, pricing)

    class ProductIn(BaseModel):
        sku: str
        name: str
        category: str
        price: float = Field(ge=0)
        stock: int = Field(default=0, ge=0)
        brand: str = ""
        supplier_id: str | None = None

    class CartAdd(BaseModel):
        sku: str
        quantity: int = Field(gt=0)

    class CheckoutIn(BaseModel):
        customer_id: str
        country: str = "DE"

    @router.get("/products")
    def products(q: str = ""):
        items = catalog.search(q) if q else catalog.active_products()
        return [product.__dict__ for product in items]

    @router.post("/products")
    def create_product(req: ProductIn):
        return catalog.upsert(Product(**req.model_dump())).__dict__

    @router.post("/cart")
    def create_cart():
        return checkout.create_cart().__dict__

    @router.post("/cart/{cart_id}/items")
    def add_item(cart_id: str, req: CartAdd):
        if cart_id not in checkout.carts:
            raise HTTPException(404, "cart_not_found")
        try:
            return checkout.add(cart_id, req.sku, req.quantity).__dict__
        except (KeyError, ValueError) as exc:
            raise HTTPException(400, str(exc)) from exc

    @router.get("/cart/{cart_id}/quote")
    def quote(cart_id: str):
        if cart_id not in checkout.carts:
            raise HTTPException(404, "cart_not_found")
        return checkout.quote(cart_id)

    @router.post("/cart/{cart_id}/checkout")
    def do_checkout(cart_id: str, req: CheckoutIn):
        if cart_id not in checkout.carts:
            raise HTTPException(404, "cart_not_found")
        try:
            return checkout.checkout(cart_id, req.customer_id, req.country)
        except (KeyError, ValueError) as exc:
            raise HTTPException(400, str(exc)) from exc
else:
    router = None
