from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict
import anthropic
import socket
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from redis.asyncio import Redis

from app.core.config import settings
from app.core.database import mongodb_client, redis_client, mongodb_connected, redis_connected
from app.core.logging import logger

router = APIRouter()

async def check_mongodb_connection() -> Dict[str, str]:
    mongodb_status = {
        "status": "down",
        "details": "Not initialized"
    }
    
    try:
        try:
            socket.gethostbyname('mongodb')
        except socket.gaierror:
            mongodb_status["details"] = "Hostname resolution failed"
            return mongodb_status
        
        if mongodb_client:
            try:
                await mongodb_client.admin.command('ping')
                mongodb_status["status"] = "up"
                mongodb_status["details"] = "Successfully connected"
            except Exception as e:
                mongodb_status["details"] = f"Connection error: {str(e)}"
        else:
            try:
                temp_client = AsyncIOMotorClient(
                    settings.MONGODB_URL,
                    serverSelectionTimeoutMS=5000,
                    connectTimeoutMS=5000
                )
                await temp_client.admin.command('ping')
                mongodb_status["status"] = "up"
                mongodb_status["details"] = "Temporary client connected"
                temp_client.close()
            except Exception as e:
                mongodb_status["details"] = f"Temporary client error: {str(e)}"
        
    except Exception as e:
        mongodb_status["details"] = f"Unexpected error: {str(e)}"
    
    return mongodb_status

async def check_redis_connection() -> Dict[str, str]:
    redis_status = {
        "status": "down",
        "details": "Not initialized"
    }
    
    try:
        try:
            socket.gethostbyname('redis')
        except socket.gaierror:
            redis_status["details"] = "Hostname resolution failed"
            return redis_status
        
        if redis_client:
            try:
                await redis_client.ping()
                redis_status["status"] = "up"
                redis_status["details"] = "Successfully connected"
            except Exception as e:
                redis_status["details"] = f"Connection error: {str(e)}"
        else:
            try:
                temp_client = Redis.from_url(
                    settings.REDIS_URL,
                    socket_timeout=5,
                    socket_connect_timeout=5
                )
                await temp_client.ping()
                redis_status["status"] = "up"
                redis_status["details"] = "Temporary client connected"
                await temp_client.close()
            except Exception as e:
                redis_status["details"] = f"Temporary client error: {str(e)}"
        
    except Exception as e:
        redis_status["details"] = f"Unexpected error: {str(e)}"
    
    return redis_status

@router.get("/", response_model=Dict[str, str])
async def health_check() -> Dict[str, str]:

    mongodb_status = await check_mongodb_connection()
    
    redis_status = await check_redis_connection()
    
    anthropic_status = "down"
    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        # Simple API call to check status
        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=10,
            messages=[{"role": "user", "content": "Hi"}]
        )
        if response:
            anthropic_status = "up"
    except Exception as e:
        logger.warning(f"Anthropic API health check failed: {str(e)}")
    
    services_down = 0
    total_services = 3
    
    if mongodb_status["status"] == "down":
        services_down += 1
        logger.warning(f"MongoDB health check failed: {mongodb_status['details']}")
    
    if redis_status["status"] == "down":
        services_down += 1
        logger.warning(f"Redis health check failed: {redis_status['details']}")
    
    if anthropic_status == "down":
        services_down += 1
        logger.warning("Anthropic API health check failed")
    
    health_status = {
        "status": "up" if services_down == 0 else "degraded" if services_down < total_services else "down",
        "mongodb": mongodb_status["status"],
        "mongodb_details": mongodb_status["details"],
        "redis": redis_status["status"],
        "redis_details": redis_status["details"],
        "anthropic": anthropic_status
    }
    
    return health_status