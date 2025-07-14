import os
import sys
from loguru import logger as loguru_logger

# Remove default handler
loguru_logger.remove()

# Configure logger
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
log_format = "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"

# Console handler
loguru_logger.add(
    sys.stdout,
    format=log_format,
    level=log_level,
    colorize=True
)

# File handlers
if not os.path.exists("logs"):
    os.makedirs("logs")

# Combined log file
loguru_logger.add(
    "logs/combined.log",
    format=log_format,
    level="DEBUG",
    rotation="100 MB",
    retention="30 days",
    compression="zip"
)

# Error log file
loguru_logger.add(
    "logs/error.log",
    format=log_format,
    level="ERROR",
    rotation="100 MB",
    retention="30 days",
    compression="zip"
)

# Export logger
logger = loguru_logger