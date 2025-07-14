"""Budget-related AI tools for financial operations."""

from typing import Dict, Any, List
from datetime import date
from src.tools.base import BaseTool, ToolResult
from src.tools.models import BudgetCreateParams, BudgetUpdateParams, BudgetWithCategoryParams, BudgetFilterParams
from src.services.budget_service import BudgetService
from src.services.category_service import CategoryService
from src.models.budget import BudgetCreate, BudgetUpdate
from src.models.category import CategoryCreate


class BudgetTools(BaseTool):
    """Tools for managing budgets."""
    
    def __init__(self):
        super().__init__()
        self.budget_service = BudgetService()
        self.category_service = CategoryService()
    
    async def create_budget(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """
        Create a new budget for a category.
        
        Args:
            params: Budget parameters including category_id, name, amount, etc.
            user_id: The user ID for the budget
            
        Returns:
            ToolResult with success status and budget details
        """
        try:
            validated_params = BudgetCreateParams(**params)
            
            budget_data = BudgetCreate(
                category_id=validated_params.category_id,
                name=validated_params.name,
                amount=validated_params.amount,
                currency=validated_params.currency,
                period_type=validated_params.period_type,
                start_date=validated_params.start_date or date.today(),
                alert_threshold=validated_params.alert_threshold
            )
            
            budget = await self.budget_service.create_budget(user_id, budget_data)
            
            return ToolResult(
                True,
                f"Created {validated_params.period_type} budget \"{validated_params.name}\" with {validated_params.currency} {validated_params.amount} limit",
                budget
            )
        except Exception as e:
            return ToolResult(False, f"Failed to create budget: {str(e)}")
    
    async def update_budget(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """
        Update an existing budget with new values.
        
        Args:
            params: Update parameters including budget_id or search criteria
            user_id: The user ID for the budget
            
        Returns:
            ToolResult with success status and updated budget details
        """
        try:
            validated_params = BudgetUpdateParams(**params)
            
            budget_id = validated_params.budget_id
            
            # If no budget_id, try to find by name or category
            if not budget_id:
                budgets = await self.budget_service.get_budgets(user_id, False)
                
                if validated_params.budget_name:
                    for budget in budgets:
                        if validated_params.budget_name.lower() in budget["name"].lower():
                            budget_id = str(budget["id"])
                            break
                elif validated_params.category_name:
                    for budget in budgets:
                        if (budget.get("category_name") and 
                            validated_params.category_name.lower() in budget["category_name"].lower()):
                            budget_id = str(budget["id"])
                            break
                
                if not budget_id:
                    available = [f"{b['name']} ({b.get('category_name', 'Unknown')})" for b in budgets]
                    return ToolResult(
                        False,
                        f"Could not find budget. Available budgets: {', '.join(available)}"
                    )
            
            # Build update data
            update_data = BudgetUpdate()
            if validated_params.name is not None:
                update_data.name = validated_params.name
            if validated_params.amount is not None:
                update_data.amount = validated_params.amount
            if validated_params.currency is not None:
                update_data.currency = validated_params.currency
            if validated_params.alert_threshold is not None:
                update_data.alert_threshold = validated_params.alert_threshold
            
            # Check if any valid update fields provided
            update_dict = update_data.dict(exclude_unset=True)
            if not update_dict:
                return ToolResult(
                    False,
                    "No valid update fields provided. Available fields: name, amount, currency, alert_threshold"
                )
            
            budget = await self.budget_service.update_budget(budget_id, user_id, update_data)
            
            if not budget:
                return ToolResult(False, "Budget not found")
            
            return ToolResult(True, "Updated budget successfully", budget)
        except Exception as e:
            return ToolResult(False, f"Failed to update budget: {str(e)}")
    
    async def delete_budget(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """
        Delete a budget.
        
        Args:
            params: Parameters containing budget_id
            user_id: The user ID for the budget
            
        Returns:
            ToolResult with success status
        """
        try:
            budget_id = params.get("budget_id")
            if not budget_id:
                return ToolResult(False, "Budget ID is required")
            
            success = await self.budget_service.delete_budget(budget_id, user_id)
            
            if not success:
                return ToolResult(False, "Budget not found")
            
            return ToolResult(True, "Deleted budget successfully")
        except Exception as e:
            return ToolResult(False, f"Failed to delete budget: {str(e)}")
    
    async def get_budgets(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """
        Get all user budgets with their current status.
        
        Args:
            params: Optional filter parameters including category_name
            user_id: The user ID for the budgets
            
        Returns:
            ToolResult with list of budgets and their status
        """
        try:
            validated_params = BudgetFilterParams(**params)
            
            budgets = await self.budget_service.get_budgets(user_id, True)
            
            # Filter by category name if provided
            if validated_params.category_name:
                budgets = [
                    b for b in budgets 
                    if (b.get("category_name") and 
                        validated_params.category_name.lower() in b["category_name"].lower())
                ]
            
            return ToolResult(
                True,
                f"Found {len(budgets)} budgets",
                budgets
            )
        except Exception as e:
            return ToolResult(False, f"Failed to get budgets: {str(e)}")
    
    async def create_budget_with_category(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """
        Create a new budget and category if it does not exist.
        
        Args:
            params: Parameters including category_name, budget_name, amount, etc.
            user_id: The user ID for the budget and category
            
        Returns:
            ToolResult with success status and created budget/category details
        """
        try:
            validated_params = BudgetWithCategoryParams(**params)
            
            # First, try to find existing category
            categories = await self.category_service.get_user_categories(user_id)
            category = None
            
            for cat in categories:
                if cat["name"].lower() == validated_params.category_name.lower():
                    category = cat
                    break
            
            # Create category if it doesn't exist
            if not category:
                category_data = CategoryCreate(
                    name=validated_params.category_name,
                    color=validated_params.category_color or "#6B7280",
                    icon=validated_params.category_icon or "folder"
                )
                category = await self.category_service.create_category(user_id, category_data)
            
            # Create budget
            budget_data = BudgetCreate(
                category_id=category["id"],
                name=validated_params.budget_name,
                amount=validated_params.amount,
                currency=validated_params.currency,
                period_type=validated_params.period_type,
                start_date=validated_params.start_date or date.today(),
                end_date=validated_params.end_date,
                alert_threshold=validated_params.alert_threshold
            )
            
            budget = await self.budget_service.create_budget(user_id, budget_data)
            
            return ToolResult(
                True,
                f"Created budget \"{validated_params.budget_name}\" for category \"{validated_params.category_name}\"",
                {"budget": budget, "category": category}
            )
        except Exception as e:
            return ToolResult(False, f"Failed to create budget with category: {str(e)}")
