#!/usr/bin/env python3
"""
FinSense startup script with development features
"""

import os
import sys
import asyncio
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Import after path setup
from src.utils.logger import logger

async def check_prerequisites():
    """Check if all prerequisites are met"""
    logger.info("🔍 Checking prerequisites...")
    
    # Check if .env file exists
    env_file = project_root / ".env"
    if not env_file.exists():
        logger.warning("⚠️  .env file not found. Creating from .env.example...")
        example_file = project_root / ".env.example"
        if example_file.exists():
            env_file.write_text(example_file.read_text())
            logger.info("✅ Created .env file from .env.example")
        else:
            logger.error("❌ .env.example file not found")
            return False
    
    # Check frontend build
    frontend_dist = project_root / "frontend" / "dist"
    if not frontend_dist.exists():
        logger.warning("⚠️  Frontend build not found. Please build the frontend first:")
        logger.info("   cd frontend && npm install && npm run build")
        return False
    
    logger.info("✅ All prerequisites met")
    return True

def main():
    """Main startup function"""
    logger.info("🚀 Starting FinSense Python Backend")
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Check prerequisites
    if not asyncio.run(check_prerequisites()):
        logger.error("❌ Prerequisites not met. Exiting.")
        sys.exit(1)
    
    # Start the application
    logger.info("🌟 Starting FastAPI application with uvicorn...")
    os.system("uvicorn main:app --host 0.0.0.0 --port 3000 --reload")

if __name__ == "__main__":
    main()