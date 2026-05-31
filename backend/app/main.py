from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.database import Base, engine
from app.routers import customers, dashboard, orders, products

settings = get_settings()

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.project_name)

if settings.cors_origin_list == ["*"]:
    allow_origins = ["*"]
else:
    allow_origins = settings.cors_origin_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(dashboard.router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
