from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.config import get_settings
from app.database import get_db

router = APIRouter(tags=["dashboard"])
settings = get_settings()


@router.get("/dashboard/summary", response_model=schemas.DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)):
    low_stock_products = (
        db.execute(
            select(models.Product)
            .where(models.Product.quantity <= settings.low_stock_threshold)
            .order_by(models.Product.quantity.asc(), models.Product.name.asc())
        )
        .scalars()
        .all()
    )

    total_products = db.execute(select(func.count(models.Product.id))).scalar_one()
    total_customers = db.execute(select(func.count(models.Customer.id))).scalar_one()
    total_orders = db.execute(select(func.count(models.Order.id))).scalar_one()

    return schemas.DashboardSummary(
        total_products=total_products,
        total_customers=total_customers,
        total_orders=total_orders,
        low_stock_products=[
            schemas.DashboardLowStockProduct(id=product.id, name=product.name, sku=product.sku, quantity=product.quantity)
            for product in low_stock_products
        ],
    )
