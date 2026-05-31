from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=schemas.OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An order must contain at least one item")

    customer = db.get(models.Customer, payload.customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    aggregated_items: dict[int, int] = {}
    for item in payload.items:
        aggregated_items[item.product_id] = aggregated_items.get(item.product_id, 0) + item.quantity

    product_ids = list(aggregated_items.keys())
    products = (
        db.execute(
            select(models.Product)
            .where(models.Product.id.in_(product_ids))
            .order_by(models.Product.id)
            .with_for_update()
        )
        .scalars()
        .all()
    )
    product_map = {product.id: product for product in products}

    if len(product_map) != len(product_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more products were not found")

    order = models.Order(customer_id=customer.id, total_amount=Decimal("0.00"), status="created")
    db.add(order)
    db.flush()

    total_amount = Decimal("0.00")
    order_items: list[models.OrderItem] = []

    for product_id, quantity in aggregated_items.items():
        product = product_map[product_id]
        if product.quantity < quantity:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient inventory for product '{product.name}'",
            )

        product.quantity -= quantity
        line_total = Decimal(product.price) * quantity
        total_amount += line_total
        order_items.append(
            models.OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=quantity,
                unit_price=product.price,
                line_total=line_total,
            )
        )

    order.total_amount = total_amount
    db.add_all(order_items)
    db.commit()
    db.refresh(order)
    return _order_to_read(db, order)


@router.get("", response_model=list[schemas.OrderRead])
def list_orders(db: Session = Depends(get_db)):
    orders = (
        db.execute(
            select(models.Order)
            .options(
                selectinload(models.Order.customer),
                selectinload(models.Order.items).selectinload(models.OrderItem.product),
            )
            .order_by(models.Order.created_at.desc())
        )
        .scalars()
        .all()
    )
    return [_hydrate_order(order) for order in orders]


@router.get("/{order_id}", response_model=schemas.OrderRead)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = (
        db.execute(
            select(models.Order)
            .where(models.Order.id == order_id)
            .options(
                selectinload(models.Order.customer),
                selectinload(models.Order.items).selectinload(models.OrderItem.product),
            )
        )
        .scalars()
        .first()
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return _hydrate_order(order)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = (
        db.execute(
            select(models.Order)
            .where(models.Order.id == order_id)
            .options(selectinload(models.Order.items))
            .with_for_update()
        )
        .scalars()
        .first()
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    for item in order.items:
        product = db.get(models.Product, item.product_id)
        if product is not None:
            product.quantity += item.quantity

    db.delete(order)
    db.commit()


def _hydrate_order(order: models.Order) -> schemas.OrderRead:
    return schemas.OrderRead(
        id=order.id,
        customer_id=order.customer_id,
        customer_name=order.customer.full_name,
        total_amount=Decimal(order.total_amount),
        status=order.status,
        items=[
            schemas.OrderItemRead(
                product_id=item.product_id,
                product_name=item.product.name,
                sku=item.product.sku,
                quantity=item.quantity,
                unit_price=Decimal(item.unit_price),
                line_total=Decimal(item.line_total),
            )
            for item in order.items
        ],
    )


def _order_to_read(db: Session, order: models.Order) -> schemas.OrderRead:
    hydrated_order = (
        db.execute(
            select(models.Order)
            .where(models.Order.id == order.id)
            .options(
                selectinload(models.Order.customer),
                selectinload(models.Order.items).selectinload(models.OrderItem.product),
            )
        )
        .scalars()
        .first()
    )
    if hydrated_order is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Order creation failed")
    return _hydrate_order(hydrated_order)
