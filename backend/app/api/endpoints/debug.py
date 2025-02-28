from fastapi import APIRouter
import os
import socket
from app.core.database import mongodb_client, redis_client, mongodb_connected, redis_connected
from app.core.config import settings

router = APIRouter()

@router.get("/dns")
async def debug_dns():
    results = {}
    for hostname in ["mongodb", "redis", "prometheus"]:
        try:
            ip_address = socket.gethostbyname(hostname)
            results[hostname] = {
                "resolved": True,
                "ip": ip_address
            }
        except Exception as e:
            results[hostname] = {
                "resolved": False,
                "error": str(e)
            }
    return results

@router.get("/db-status")
async def debug_db_status():
    mongodb_status = {
        "client_exists": mongodb_client is not None,
        "connected": mongodb_connected,
        "configured_url": settings.MONGODB_URL,
        "environment_url": os.environ.get("MONGODB_URL", "Not set")
    }
    
    redis_status = {
        "client_exists": redis_client is not None,
        "connected": redis_connected,
        "configured_host": settings.REDIS_HOST,
        "configured_port": settings.REDIS_PORT,
        "environment_url": os.environ.get("REDIS_URL", "Not set")
    }
    
    # Try direct connection
    if mongodb_client and not mongodb_connected:
        try:
            # Test the connection directly
            await mongodb_client.admin.command('ping')
            mongodb_status["direct_ping"] = "success"
        except Exception as e:
            mongodb_status["direct_ping"] = f"failed: {str(e)}"
    
    if redis_client and not redis_connected:
        try:
            # Test the connection directly
            await redis_client.ping()
            redis_status["direct_ping"] = "success"
        except Exception as e:
            redis_status["direct_ping"] = f"failed: {str(e)}"
    
    return {
        "mongodb": mongodb_status,
        "redis": redis_status
    }