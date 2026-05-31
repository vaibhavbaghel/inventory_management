from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field

PositiveQuantity = Annotated[int, Field(ge=1)]
NonNegativeQuantity = Annotated[int, Field(ge=0)]
PositivePrice = Annotated[Decimal, Field(gt=0)]


class ProductBase(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=255)]
    sku: Annotated[str, Field(min_length=2, max_length=100)]
    price: PositivePrice
    quantity: NonNegativeQuantity
    description: str | None = Field(default=None, max_length=2000)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Annotated[str | None, Field(min_length=2, max_length=255)] = None
    sku: Annotated[str | None, Field(min_length=2, max_length=100)] = None
    price: PositivePrice | None = None
    quantity: NonNegativeQuantity | None = None
    description: str | None = Field(default=None, max_length=2000)


class ProductRead(ProductBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class CustomerBase(BaseModel):
    full_name: Annotated[str, Field(min_length=2, max_length=255)]
    email: EmailStr
    phone: Annotated[str, Field(min_length=5, max_length=50)]


class CustomerCreate(CustomerBase):
    pass


class CustomerRead(CustomerBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: PositiveQuantity


class OrderItemRead(BaseModel):
    product_id: int
    product_name: str
    sku: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal

    model_config = ConfigDict(from_attributes=True)


class OrderCreate(BaseModel):
    customer_id: int
    items: list[OrderItemCreate]


class OrderRead(BaseModel):
    id: int
    customer_id: int
    customer_name: str
    total_amount: Decimal
    status: str
    items: list[OrderItemRead]


class DashboardLowStockProduct(BaseModel):
    id: int
    name: str
    sku: str
    quantity: int

    model_config = ConfigDict(from_attributes=True)


class DashboardSummary(BaseModel):
    total_products: int
    total_customers: int
    total_orders: int
    low_stock_products: list[DashboardLowStockProduct]
