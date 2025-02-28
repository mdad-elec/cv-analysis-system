from fastapi import APIRouter
from app.api.endpoints import documents, queries, health, debug

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(queries.router, prefix="/queries", tags=["queries"])
api_router.include_router(debug.router, prefix="/debug", tags=["debug"])