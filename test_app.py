#!/usr/bin/env python3
"""
Simple test script to verify the Python backend functionality
"""

import asyncio
import os
import sys
from src.config.database import init_database, execute_query_one
from src.config.redis import init_redis
from src.utils.logger import logger

async def test_database_connection():
    """Test database connection"""
    try:
        await init_database()
        
        # Test basic query
        result = await execute_query_one("SELECT NOW() as current_time")
        logger.info(f"✅ Database connection successful: {result['current_time']}")
        return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False

async def test_redis_connection():
    """Test Redis connection"""
    try:
        await init_redis()
        logger.info("✅ Redis connection successful")
        return True
    except Exception as e:
        logger.error(f"❌ Redis connection failed: {e}")
        return False

async def test_environment_variables():
    """Test required environment variables"""
    required_vars = [
        "DATABASE_URL",
        "REDIS_URL", 
        "JWT_SECRET",
        "DEEPSEEK_API_KEY"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        logger.warning(f"⚠️  Missing environment variables: {', '.join(missing_vars)}")
        return False
    else:
        logger.info("✅ All required environment variables are set")
        return True

async def main():
    """Run all tests"""
    logger.info("🚀 Starting FinSense Python Backend Tests")
    
    tests = [
        ("Environment Variables", test_environment_variables()),
        ("Database Connection", test_database_connection()),
        ("Redis Connection", test_redis_connection())
    ]
    
    results = []
    for test_name, test_coro in tests:
        logger.info(f"Running test: {test_name}")
        try:
            result = await test_coro
            results.append((test_name, result))
        except Exception as e:
            logger.error(f"Test {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    logger.info("\n" + "="*50)
    logger.info("TEST RESULTS SUMMARY")
    logger.info("="*50)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        logger.info(f"{test_name}: {status}")
        if result:
            passed += 1
    
    logger.info(f"\nTests passed: {passed}/{len(results)}")
    
    if passed == len(results):
        logger.info("🎉 All tests passed! The backend is ready.")
        sys.exit(0)
    else:
        logger.error("❌ Some tests failed. Please check the configuration.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())