import os
import redis.asyncio as redis
from typing import Optional
from src.utils.logger import logger

# Global Redis client
redis_client: Optional[redis.Redis] = None


async def init_redis():
    """Initialize Redis connection"""
    global redis_client
    
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    try:
        redis_client = redis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_timeout=5,
            socket_connect_timeout=5,
            retry_on_timeout=True
        )
        
        # Test connection
        await redis_client.ping()
        logger.info("Redis connected successfully")
    except Exception as error:
        logger.error(f"Redis connection failed: {error}")
        # Don't raise error as Redis is not critical for basic functionality
        redis_client = None


async def get_redis_client():
    """Get Redis client"""
    return redis_client


async def set_cache(key: str, value: str, expire: int = 3600):
    """Set a value in Redis cache"""
    if redis_client:
        try:
            await redis_client.setex(key, expire, value)
        except Exception as e:
            logger.warning(f"Failed to set cache key {key}: {e}")


async def get_cache(key: str) -> Optional[str]:
    """Get a value from Redis cache"""
    if redis_client:
        try:
            return await redis_client.get(key)
        except Exception as e:
            logger.warning(f"Failed to get cache key {key}: {e}")
    return None


async def delete_cache(key: str):
    """Delete a key from Redis cache"""
    if redis_client:
        try:
            await redis_client.delete(key)
        except Exception as e:
            logger.warning(f"Failed to delete cache key {key}: {e}")


async def close_redis():
    """Close Redis connection"""
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None
        logger.info("Redis connection closed")