import os
import asyncio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.api import api_router
from app.core.config import settings
from app.core.logging import logger
from app.core.database import (
    connect_to_mongodb, 
    connect_to_redis, 
    close_mongodb_connection, 
    close_redis_connection,
    maintain_database_connections
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )

@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting {settings.PROJECT_NAME} in {settings.APP_ENV} environment")
    
    try:
        await connect_to_mongodb()
        await connect_to_redis()
        
        asyncio.create_task(maintain_database_connections())
        
        logger.info(f"{settings.PROJECT_NAME} started with initial database connections")
    except Exception as e:
        logger.error(f"Failed to establish initial database connections: {str(e)}")
    
    logger.info("Service ready to accept requests")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info(f"Shutting down {settings.PROJECT_NAME}")
    try:
        await close_mongodb_connection()
        await close_redis_connection()
    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}")

@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}