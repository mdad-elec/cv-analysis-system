import asyncio
import os
import socket
from motor.motor_asyncio import AsyncIOMotorClient
from redis.asyncio import Redis
from typing import Optional

from app.core.config import settings
from app.core.logging import logger

mongodb_client: Optional[AsyncIOMotorClient] = None
redis_client: Optional[Redis] = None

mongodb_connected: bool = False
redis_connected: bool = False

async def resolve_hostname(hostname: str, max_attempts: int = 10) -> bool:

    for attempt in range(max_attempts):
        try:
            ip_address = socket.gethostbyname(hostname)
            logger.info(f"Service {hostname} resolved to IP: {ip_address}")
            return True
        except socket.gaierror:
            logger.warning(f"Hostname resolution attempt {attempt + 1}/{max_attempts} failed for {hostname}")
            await asyncio.sleep(2 ** attempt)  
    
    logger.error(f"Failed to resolve hostname: {hostname}")
    return False

async def connect_to_mongodb() -> bool:

    global mongodb_client, mongodb_connected
    
    if not await resolve_hostname('mongodb'):
        return False
    
    try:
        mongodb_client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            maxPoolSize=settings.MAX_CONNECTIONS_COUNT,
            minPoolSize=settings.MIN_CONNECTIONS_COUNT,
            serverSelectionTimeoutMS=15000,     
            connectTimeoutMS=15000,           
            socketTimeoutMS=60000,             
            retryWrites=True,
            waitQueueTimeoutMS=15000          
        )
        
        await mongodb_client.admin.command('ping')
        
        mongodb_connected = True
        logger.info("Successfully established MongoDB connection")
        return True
    
    except Exception as e:
        logger.error(f"MongoDB connection failed: {str(e)}")
        mongodb_connected = False
        return False

async def connect_to_redis() -> bool:

    global redis_client, redis_connected
    
    if not await resolve_hostname('redis'):
        return False
    
    try:
        redis_client = Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_timeout=10,        
            socket_connect_timeout=10,       
            retry_on_timeout=True,
            max_connections=settings.MAX_CONNECTIONS_COUNT
        )
        
        await redis_client.ping()
        
        redis_connected = True
        logger.info("Successfully established Redis connection")
        return True
    
    except Exception as e:
        logger.error(f"Redis connection failed: {str(e)}")
        redis_connected = False
        return False

async def maintain_database_connections():

    while True:
        try:
            if not mongodb_connected:
                await connect_to_mongodb()
            
            if not redis_connected:
                await connect_to_redis()
            
            await asyncio.sleep(30)
        
        except Exception as e:
            logger.error(f"Error in connection maintenance: {str(e)}")
            await asyncio.sleep(10)  

async def close_mongodb_connection():
    global mongodb_client, mongodb_connected
    if mongodb_client:
        try:
            mongodb_client.close()
            mongodb_connected = False
            logger.info("MongoDB connection closed")
        except Exception as e:
            logger.error(f"Error closing MongoDB connection: {str(e)}")

async def close_redis_connection():
    global redis_client, redis_connected
    if redis_client:
        try:
            await redis_client.close()
            redis_connected = False
            logger.info("Redis connection closed")
        except Exception as e:
            logger.error(f"Error closing Redis connection: {str(e)}")

def get_cvs_collection():
    if not mongodb_client or not mongodb_connected:
        raise Exception("MongoDB connection is not established. Please check system logs.")
    return mongodb_client[settings.MONGODB_NAME][settings.CV_COLLECTION_NAME]

def get_parsed_data_collection():
    if not mongodb_client or not mongodb_connected:
        raise Exception("MongoDB connection is not established. Please check system logs.")
    return mongodb_client[settings.MONGODB_NAME][settings.PARSED_DATA_COLLECTION_NAME]