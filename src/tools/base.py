"""Base classes and utilities for AI tools."""

from typing import Dict, Any, Optional
from datetime import date
import uuid
from src.utils.logger import logger


class ToolResult:
    """
    Standardized result class for all AI tools.
    
    Provides consistent structure for tool execution results across all
    financial operations.
    
    Attributes:
        success: Boolean indicating if the operation succeeded
        message: Human-readable message describing the result
        data: Optional data payload returned by the operation
    """
    
    def __init__(self, success: bool, message: str, data: Any = None):
        self.success = success
        self.message = message
        self.data = data
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert ToolResult to dictionary format for API responses."""
        result = {
            "success": self.success,
            "message": self.message
        }
        if self.data is not None:
            result["data"] = self.data
        return result


class BaseTool:
    """Base class for all AI tools with common functionality."""
    
    def __init__(self):
        self.logger = logger
    
    def validate_date_format(self, date_str: str) -> bool:
        """Validate date string format (YYYY-MM-DD)."""
        try:
            date.fromisoformat(date_str)
            return True
        except ValueError:
            return False
    
    def generate_id(self) -> str:
        """Generate a unique identifier for new records."""
        return str(uuid.uuid4())
    
    def format_currency(self, amount: float, currency: str = "USD") -> str:
        """Format currency amount with symbol."""
        symbols = {
            "USD": "$",
            "EUR": "€",
            "GBP": "£",
            "JPY": "¥"
        }
        symbol = symbols.get(currency, currency)
        return f"{symbol}{amount:.2f}"
    
    def validate_required_params(self, params: Dict[str, Any], required: list) -> Optional[str]:
        """Validate that all required parameters are present."""
        missing = [param for param in required if param not in params or params[param] is None]
        if missing:
            return f"Missing required parameters: {', '.join(missing)}"
        return None
