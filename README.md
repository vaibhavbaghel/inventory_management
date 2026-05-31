# Inventory & Order Management System

A production-ready full-stack inventory and order management system built with React, FastAPI, PostgreSQL, Docker, and Docker Compose.

## Features

- Product CRUD with unique SKU enforcement and stock validation
- Customer creation, listing, and deletion with unique email enforcement
- Order creation with automatic stock deduction and total calculation
- Order listing, detail view, and deletion with inventory restoration
- Dashboard summaries for total products, customers, orders, and low-stock items
- Responsive UI for desktop and mobile
- Containerized runtime with separate frontend, backend, and PostgreSQL services

## Tech Stack

- Frontend: React (JavaScript), Vite
- Backend: FastAPI, SQLAlchemy
- Database: PostgreSQL
- Containerization: Docker, Docker Compose

## Local Development

1. Copy `.env.example` to `.env` and adjust values if needed.
2. Start PostgreSQL, backend, and frontend with Docker Compose:

```bash
docker compose up --build
```

3. Open the app:
- Frontend: http://localhost:3000
- Backend health check: http://localhost:8000/health
- Backend API docs: http://localhost:8000/docs

## Backend API

- `POST /products`
- `GET /products`
- `GET /products/{id}`
- `PUT /products/{id}`
- `DELETE /products/{id}`
- `POST /customers`
- `GET /customers`
- `GET /customers/{id}`
- `DELETE /customers/{id}`
- `POST /orders`
- `GET /orders`
- `GET /orders/{id}`
- `DELETE /orders/{id}`
- `GET /dashboard/summary`
