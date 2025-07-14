from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback
from src.utils.logger import logger


class CustomHTTPException(HTTPException):
    """Custom HTTP exception with additional context"""
    def __init__(self, status_code: int, detail: str, context: dict = None):
        super().__init__(status_code=status_code, detail=detail)
        self.context = context or {}


def create_error(message: str, status_code: int = 400, context: dict = None):
    """Create a custom HTTP exception"""
    return CustomHTTPException(
        status_code=status_code,
        detail=message,
        context=context
    )


async def custom_http_exception_handler(request: Request, exc: CustomHTTPException):
    """Handle custom HTTP exceptions"""
    logger.error(f"HTTP Exception: {exc.detail} - Status: {exc.status_code}")
    
    response_data = {
        "error": True,
        "message": exc.detail,
        "status_code": exc.status_code,
        "path": str(request.url)
    }
    
    if exc.context:
        response_data.update(exc.context)
    
    return JSONResponse(
        status_code=exc.status_code,
        content=response_data
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions"""
    logger.error(f"HTTP Exception: {exc.detail} - Status: {exc.status_code}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url)
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    logger.error(f"Validation Error: {exc.errors()}")
    
    # Format validation errors
    errors = []
    for error in exc.errors():
        errors.append({
            "field": " -> ".join(str(x) for x in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    return JSONResponse(
        status_code=422,
        content={
            "error": True,
            "message": "Validation failed",
            "status_code": 422,
            "path": str(request.url),
            "details": errors
        }
    )


async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled Exception: {str(exc)}")
    logger.error(f"Exception type: {type(exc).__name__}")
    logger.error(f"Request URL: {request.url}")
    logger.error(f"Request method: {request.method}")
    
    # Log the full traceback
    logger.error(f"Full traceback:\n{traceback.format_exc()}")
    
    # Check if this is actually a validation error that didn't get caught
    if hasattr(exc, 'errors') and callable(getattr(exc, 'errors')):
        try:
            validation_errors = exc.errors()
            logger.error(f"Validation errors found: {validation_errors}")
        except Exception as e:
            logger.error(f"Error getting validation details: {e}")
    
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "Internal server error",
            "status_code": 500,
            "path": str(request.url),
            "exception_type": type(exc).__name__
        }
    )


def add_error_handlers(app: FastAPI):
    """Add all error handlers to the FastAPI app"""
    app.add_exception_handler(CustomHTTPException, custom_http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)