import os
import asyncpg
from typing import Optional
from src.utils.logger import logger

# Global connection pool
pool: Optional[asyncpg.Pool] = None


async def init_database():
    """Initialize the database connection pool"""
    global pool
    
    database_url = os.getenv(
        "DATABASE_URL", 
        "postgresql://finsense_user:finsense_password@localhost:5432/finsense"
    )
    
    try:
        pool = await asyncpg.create_pool(
            database_url,
            min_size=5,
            max_size=20,
            command_timeout=60,
            server_settings={
                'jit': 'off'  # Disable JIT for better startup performance
            }
        )
        
        # Test connection
        async with pool.acquire() as connection:
            await connection.execute('SELECT 1')
        
        logger.info("Database connected successfully")
    except Exception as error:
        logger.error(f"Database connection failed: {error}")
        raise error


async def get_db_connection():
    """Get a database connection from the pool"""
    if not pool:
        raise Exception("Database pool not initialized")
    return pool.acquire()


async def execute_query(query: str, *args):
    """Execute a query with parameters"""
    async with await get_db_connection() as connection:
        return await connection.fetch(query, *args)


async def execute_query_one(query: str, *args):
    """Execute a query and return first result"""
    async with await get_db_connection() as connection:
        return await connection.fetchrow(query, *args)


async def execute_command(query: str, *args):
    """Execute a command (INSERT, UPDATE, DELETE)"""
    async with await get_db_connection() as connection:
        return await connection.execute(query, *args)


async def set_user_context(connection, user_id: str):
    """Set the user context for row-level security"""
    await connection.execute(
        "SELECT set_config('app.current_user_id', $1, true)",
        str(user_id)
    )


class DatabaseManager:
    """Database manager for handling transactions and user context"""
    
    def __init__(self, user_id: Optional[str] = None):
        self.user_id = user_id
        self.connection = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        if not pool:
            raise Exception("Database pool not initialized")
        
        self.connection = await pool.acquire()
        
        if self.user_id:
            await set_user_context(self.connection, self.user_id)
        
        return self.connection
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.connection:
            await pool.release(self.connection)
    
    def transaction(self):
        """Return transaction context manager"""
        return self.connection.transaction()


async def close_database():
    """Close the database connection pool"""
    global pool
    if pool:
        await pool.close()
        pool = None
        logger.info("Database connection pool closed")