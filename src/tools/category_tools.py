"""Category-related AI tools for financial operations."""

from typing import Dict, Any
from src.tools.base import BaseTool, ToolResult
from src.tools.models import CategoryCreateParams
from src.services.category_service import CategoryService
from src.models.category import CategoryCreate


class CategoryTools(BaseTool):
    """Tools for managing spending categories."""
    
    def __init__(self):
        super().__init__()
        self.category_service = CategoryService()
    
    async def create_category(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """
        Create a new spending category.
        
        Args:
            params: Category parameters including name, color, and icon
            user_id: The user ID for the category
            
        Returns:
            ToolResult with success status and category details
        """
        try:
            validated_params = CategoryCreateParams(**params)
            
            category_data = CategoryCreate(
                name=validated_params.name,
                color=validated_params.color,
                icon=validated_params.icon
            )
            
            category = await self.category_service.create_category(user_id, category_data)
            
            return ToolResult(
                True,
                f"Created category \"{validated_params.name}\"",
                category
            )
        except Exception as e:
            return ToolResult(False, f"Failed to create category: {str(e)}")
