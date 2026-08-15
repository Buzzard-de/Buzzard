try:
    from fastapi import APIRouter
    from pydantic import BaseModel, Field
except ImportError:
    APIRouter = None

from buzzard_ai_complete.commerce.service import CommerceService

if APIRouter:
    router = APIRouter(prefix="/commerce", tags=["commerce"])
    service = CommerceService()

    class ProductRequest(BaseModel):
        sku: str
        name: str
        category: str
        purchase_price: float = Field(ge=0)
        shipping_cost: float = Field(default=0, ge=0)
        marketplace_fee: float = Field(default=0, ge=0)
        payment_fee: float = Field(default=0, ge=0)
        tax_rate: float = Field(default=0, ge=0)
        ad_cost: float = Field(default=0, ge=0)
        target_margin: float = Field(default=0.07, ge=0, lt=1)

    class EvaluationRequest(BaseModel):
        sku: str
        selling_price: float = Field(gt=0)

    @router.post("/products")
    def create_product(req: ProductRequest):
        data = req.model_dump()
        sku = data.pop("sku")
        name = data.pop("name")
        category = data.pop("category")
        pid = service.products.upsert(sku, name, category, **data)
        return {"id": pid, "sku": sku}

    @router.post("/evaluate")
    def evaluate(req: EvaluationRequest):
        return service.evaluate_product(req.sku, req.selling_price)
else:
    router = None
