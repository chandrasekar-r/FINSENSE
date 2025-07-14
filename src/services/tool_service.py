from typing import Dict, List, Any, Optional
from datetime import date
import uuid
from src.services.transaction_service import TransactionService
from src.services.budget_service import BudgetService
from src.services.category_service import CategoryService
from src.models.transaction import TransactionCreate, TransactionUpdate
from src.models.budget import BudgetCreate, BudgetUpdate
from src.models.category import CategoryCreate
from src.utils.logger import logger


class ToolResult:
    def __init__(self, success: bool, message: str, data: Any = None):
        self.success = success
        self.message = message
        self.data = data
    
    def to_dict(self) -> Dict[str, Any]:
        result = {
            "success": self.success,
            "message": self.message
        }
        if self.data is not None:
            result["data"] = self.data
        return result


class ToolService:
    """Service for AI function calling tools"""
    
    def __init__(self):
        self.transaction_service = TransactionService()
        self.budget_service = BudgetService()
        self.category_service = CategoryService()
    
    def get_available_tools(self) -> List[Dict[str, Any]]:
        """Get all available tools for AI function calling"""
        return [
            {
                "name": "add_transaction",
                "description": "Add a new transaction (expense or income)",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "amount": {"type": "number", "description": "Transaction amount (always positive)"},
                        "description": {"type": "string", "description": "Transaction description"},
                        "category_id": {"type": "string", "description": "Category ID for the transaction"},
                        "transaction_type": {"type": "string", "enum": ["income", "expense"], "description": "Type of transaction"},
                        "transaction_date": {"type": "string", "description": "Date in YYYY-MM-DD format (optional, defaults to today)"},
                        "merchant_name": {"type": "string", "description": "Merchant or vendor name (optional)"}
                    },
                    "required": ["amount", "description", "category_id", "transaction_type"]
                }
            },
            {
                "name": "update_transaction",
                "description": "Update an existing transaction",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "transaction_id": {"type": "string", "description": "ID of transaction to update"},
                        "amount": {"type": "number", "description": "New amount (optional)"},
                        "description": {"type": "string", "description": "New description (optional)"},
                        "category_id": {"type": "string", "description": "New category ID (optional)"},
                        "transaction_type": {"type": "string", "enum": ["income", "expense"], "description": "New transaction type (optional)"},
                        "merchant_name": {"type": "string", "description": "New merchant name (optional)"}
                    },
                    "required": ["transaction_id"]
                }
            },
            {
                "name": "delete_transaction",
                "description": "Delete a transaction",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "transaction_id": {"type": "string", "description": "ID of transaction to delete"}
                    },
                    "required": ["transaction_id"]
                }
            },
            {
                "name": "create_budget",
                "description": "Create a new budget for a category",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "category_id": {"type": "string", "description": "Category ID for the budget"},
                        "name": {"type": "string", "description": "Budget name"},
                        "amount": {"type": "number", "description": "Budget amount"},
                        "currency": {"type": "string", "description": "Currency code (e.g., USD, EUR). Defaults to USD."},
                        "period_type": {"type": "string", "enum": ["weekly", "monthly", "yearly"], "description": "Budget period"},
                        "start_date": {"type": "string", "description": "Start date in YYYY-MM-DD format (optional)"},
                        "alert_threshold": {"type": "number", "description": "Alert threshold percentage (optional, default 80)"}
                    },
                    "required": ["category_id", "name", "amount", "period_type"]
                }
            },
            {
                "name": "update_budget",
                "description": "Update an existing budget with new values. At least one update field must be provided.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "budget_id": {"type": "string", "description": "ID of budget to update (use if known)"},
                        "budget_name": {"type": "string", "description": "Name of budget to find and update (alternative to budget_id)"},
                        "category_name": {"type": "string", "description": "Category name to find budget (alternative to budget_id)"},
                        "name": {"type": "string", "description": "New budget name (optional)"},
                        "amount": {"type": "number", "description": "New budget amount (optional)"},
                        "currency": {"type": "string", "description": "New currency code (optional)"},
                        "alert_threshold": {"type": "number", "description": "New alert threshold percentage (optional)"}
                    },
                    "required": []
                }
            },
            {
                "name": "delete_budget",
                "description": "Delete a budget",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "budget_id": {"type": "string", "description": "ID of budget to delete"}
                    },
                    "required": ["budget_id"]
                }
            },
            {
                "name": "create_category",
                "description": "Create a new spending category",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "description": "Category name"},
                        "color": {"type": "string", "description": "Category color (hex code, optional)"},
                        "icon": {"type": "string", "description": "Category icon name (optional)"}
                    },
                    "required": ["name"]
                }
            },
            {
                "name": "get_transactions",
                "description": "Get transactions with optional filters. IMPORTANT: When users ask about receipt details, use this to find transactions first, then IMMEDIATELY use get_receipt_items with the transaction_id to show detailed receipt items.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "category": {"type": "string", "description": "Filter by category name (optional)"},
                        "start_date": {"type": "string", "description": "Start date in YYYY-MM-DD format (optional)"},
                        "end_date": {"type": "string", "description": "End date in YYYY-MM-DD format (optional)"},
                        "transaction_type": {"type": "string", "enum": ["income", "expense"], "description": "Filter by transaction type (optional)"},
                        "merchant": {"type": "string", "description": "Filter by merchant name (optional)"},
                        "limit": {"type": "number", "description": "Number of transactions to return (optional, default 10)"}
                    },
                    "required": []
                }
            },
            {
                "name": "get_spending_analysis",
                "description": "Get detailed spending analysis and insights",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "period": {"type": "string", "enum": ["week", "month", "year"], "description": "Analysis period (optional, default month)"}
                    },
                    "required": []
                }
            },
            {
                "name": "get_budgets",
                "description": "Get all user budgets with their current status",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "category_name": {"type": "string", "description": "Filter by category name (optional)"}
                    },
                    "required": []
                }
            },
            {
                "name": "create_budget_with_category",
                "description": "Create a new budget and category if it does not exist",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "category_name": {"type": "string", "description": "Category name (will be created if it does not exist)"},
                        "budget_name": {"type": "string", "description": "Budget name"},
                        "amount": {"type": "number", "description": "Budget amount"},
                        "currency": {"type": "string", "description": "Currency code (e.g., USD, EUR). Defaults to USD."},
                        "period_type": {"type": "string", "enum": ["weekly", "monthly", "yearly"], "description": "Budget period"},
                        "start_date": {"type": "string", "description": "Start date in YYYY-MM-DD format (optional)"},
                        "end_date": {"type": "string", "description": "End date in YYYY-MM-DD format (optional)"},
                        "alert_threshold": {"type": "number", "description": "Alert threshold percentage (optional, default 80)"},
                        "category_color": {"type": "string", "description": "Category color (hex code, optional)"},
                        "category_icon": {"type": "string", "description": "Category icon name (optional)"}
                    },
                    "required": ["category_name", "budget_name", "amount", "period_type"]
                }
            },
            {
                "name": "get_receipt_items",
                "description": "MANDATORY: Get detailed individual items from a scanned receipt. ALWAYS use this tool when users ask about: specific items they bought, what was on their receipt, individual product details, itemized breakdown of purchases, or 'show me the detailed receipt'. This shows each item name, price, quantity, and category from receipts. Use the transaction_id from get_transactions results. NOTE: Only transactions created from scanned receipts will have item-level data.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "receipt_id": {"type": "string", "description": "Receipt ID to get items from"},
                        "transaction_id": {"type": "string", "description": "Transaction ID to find related receipt (alternative to receipt_id)"}
                    },
                    "required": []
                }
            }
        ]
    
    async def execute_tool(self, tool_name: str, parameters: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Execute a tool and return result"""
        try:
            logger.info(f"Executing tool: {tool_name} with params: {parameters}")
            
            if tool_name == "add_transaction":
                result = await self._add_transaction(parameters, user_id)
            elif tool_name == "update_transaction":
                result = await self._update_transaction(parameters, user_id)
            elif tool_name == "delete_transaction":
                result = await self._delete_transaction(parameters, user_id)
            elif tool_name == "create_budget":
                result = await self._create_budget(parameters, user_id)
            elif tool_name == "update_budget":
                result = await self._update_budget(parameters, user_id)
            elif tool_name == "delete_budget":
                result = await self._delete_budget(parameters, user_id)
            elif tool_name == "create_category":
                result = await self._create_category(parameters, user_id)
            elif tool_name == "get_transactions":
                result = await self._get_transactions(parameters, user_id)
            elif tool_name == "get_spending_analysis":
                result = await self._get_spending_analysis(parameters, user_id)
            elif tool_name == "get_budgets":
                result = await self._get_budgets(parameters, user_id)
            elif tool_name == "create_budget_with_category":
                result = await self._create_budget_with_category(parameters, user_id)
            elif tool_name == "get_receipt_items":
                result = await self._get_receipt_items(parameters, user_id)
            else:
                result = ToolResult(False, f"Unknown tool: {tool_name}")
            
            # Debug logging to check result type
            logger.info(f"Tool {tool_name} result type: {type(result)}")
            logger.info(f"Tool {tool_name} result value: {result}")
            
            # Ensure result is a ToolResult
            if not isinstance(result, ToolResult):
                logger.error(f"Tool {tool_name} returned unexpected type: {type(result)} - {result}")
                return ToolResult(False, f"Tool returned invalid result type: {type(result).__name__}").to_dict()
            
            result_dict = result.to_dict()
            logger.info(f"Tool {tool_name} result dict: {result_dict}")
            return result_dict
        
        except Exception as e:
            logger.error(f"Tool execution error ({tool_name}): {e}")
            return ToolResult(False, f"Tool execution failed: {str(e)}").to_dict()
    
    async def _add_transaction(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """Add a new transaction"""
        try:
            transaction_data = TransactionCreate(
                vendor_name=params.get("merchant_name", params["description"]),
                amount=params["amount"],
                currency="USD",  # Default currency, could be parameterized
                transaction_date=params.get("transaction_date", date.today()),
                description=params["description"],
                transaction_type=params["transaction_type"],
                category_id=params["category_id"]
            )
            
            transaction = await self.transaction_service.create_transaction(user_id, transaction_data)
            
            return ToolResult(
                True,
                f"Added {params['transaction_type']} transaction: ${params['amount']} for {params['description']}",
                transaction
            )
        except Exception as e:
            return ToolResult(False, f"Failed to add transaction: {str(e)}")
    
    async def _update_transaction(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """Update an existing transaction"""
        try:
            update_data = TransactionUpdate()
            
            if "amount" in params:
                update_data.amount = params["amount"]
            if "description" in params:
                update_data.description = params["description"]
            if "category_id" in params:
                update_data.category_id = params["category_id"]
            if "transaction_type" in params:
                update_data.transaction_type = params["transaction_type"]
            if "merchant_name" in params:
                update_data.vendor_name = params["merchant_name"]
            
            transaction = await self.transaction_service.update_transaction(
                user_id, params["transaction_id"], update_data
            )
            
            if not transaction:
                return ToolResult(False, "Transaction not found")
            
            return ToolResult(True, "Updated transaction successfully", transaction)
        except Exception as e:
            return ToolResult(False, f"Failed to update transaction: {str(e)}")
    
    async def _delete_transaction(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """Delete a transaction"""
        try:
            success = await self.transaction_service.delete_transaction(
                user_id, params["transaction_id"]
            )
            
            if not success:
                return ToolResult(False, "Transaction not found")
            
            return ToolResult(True, "Deleted transaction successfully")
        except Exception as e:
            return ToolResult(False, f"Failed to delete transaction: {str(e)}")
    
    async def _create_budget(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """Create a new budget"""
        try:
            budget_data = BudgetCreate(
                category_id=params["category_id"],
                name=params["name"],
                amount=params["amount"],
                currency=params.get("currency", "USD"),
                period_type=params["period_type"],
                start_date=params.get("start_date", date.today()),
                alert_threshold=params.get("alert_threshold", 80)
            )
            
            budget = await self.budget_service.create_budget(user_id, budget_data)
            
            return ToolResult(
                True,
                f"Created {params['period_type']} budget \"{params['name']}\" with {params.get('currency', 'USD')} {params['amount']} limit",
                budget
            )
        except Exception as e:
            return ToolResult(False, f"Failed to create budget: {str(e)}")
    
    async def _update_budget(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """Update an existing budget"""
        try:
            budget_id = params.get("budget_id")
            
            # If no budget_id, try to find by name or category
            if not budget_id:
                budgets = await self.budget_service.get_budgets(user_id, False)
                
                if params.get("budget_name"):
                    for budget in budgets:
                        if params["budget_name"].lower() in budget["name"].lower():
                            budget_id = str(budget["id"])
                            break
                elif params.get("category_name"):
                    for budget in budgets:
                        if (budget.get("category_name") and 
                            params["category_name"].lower() in budget["category_name"].lower()):
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
            if "name" in params:
                update_data.name = params["name"]
            if "amount" in params:
                update_data.amount = params["amount"]
            if "currency" in params:
                update_data.currency = params["currency"]
            if "alert_threshold" in params:
                update_data.alert_threshold = params["alert_threshold"]
            
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
    
    async def _delete_budget(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """Delete a budget"""
        try:
            success = await self.budget_service.delete_budget(params["budget_id"], user_id)
            
            if not success:
                return ToolResult(False, "Budget not found")
            
            return ToolResult(True, "Deleted budget successfully")
        except Exception as e:
            return ToolResult(False, f"Failed to delete budget: {str(e)}")
    
    async def _create_category(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """Create a new category"""
        try:
            category_data = CategoryCreate(
                name=params["name"],
                color=params.get("color", "#6B7280"),
                icon=params.get("icon", "folder")
            )
            
            category = await self.category_service.create_category(user_id, category_data)
            
            return ToolResult(
                True,
                f"Created category \"{params['name']}\"",
                category
            )
        except Exception as e:
            return ToolResult(False, f"Failed to create category: {str(e)}")
    
    async def _get_transactions(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """Get transactions with filters"""
        try:
            from src.models.transaction import TransactionFilter
            
            filters = TransactionFilter(
                start_date=params.get("start_date"),
                end_date=params.get("end_date"),
                transaction_type=params.get("transaction_type"),
                vendor_name=params.get("merchant"),
                limit=params.get("limit", 10)
            )
            
            transactions = await self.transaction_service.get_transactions(user_id, filters)
            
            return ToolResult(
                True,
                f"Found {len(transactions)} transactions",
                transactions
            )
        except Exception as e:
            return ToolResult(False, f"Failed to get transactions: {str(e)}")
    
    async def _get_spending_analysis(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """Get spending analysis"""
        try:
            period = params.get("period", "month")
            
            # For now, return basic summary
            summary = await self.transaction_service.get_spending_summary(user_id)
            category_summary = await self.transaction_service.get_category_summary(user_id)
            
            return ToolResult(
                True,
                f"Spending analysis for {period}",
                {
                    "summary": summary,
                    "category_breakdown": category_summary
                }
            )
        except Exception as e:
            return ToolResult(False, f"Failed to get spending analysis: {str(e)}")
    
    async def _get_budgets(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """Get all budgets"""
        try:
            budgets = await self.budget_service.get_budgets(user_id, True)
            
            # Filter by category name if provided
            if params.get("category_name"):
                budgets = [
                    b for b in budgets 
                    if (b.get("category_name") and 
                        params["category_name"].lower() in b["category_name"].lower())
                ]
            
            return ToolResult(
                True,
                f"Found {len(budgets)} budgets",
                budgets
            )
        except Exception as e:
            return ToolResult(False, f"Failed to get budgets: {str(e)}")
    
    async def _create_budget_with_category(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """Create budget and category if needed"""
        try:
            # First, try to find existing category
            categories = await self.category_service.get_user_categories(user_id)
            category = None
            
            for cat in categories:
                if cat["name"].lower() == params["category_name"].lower():
                    category = cat
                    break
            
            # Create category if it doesn't exist
            if not category:
                category_data = CategoryCreate(
                    name=params["category_name"],
                    color=params.get("category_color", "#6B7280"),
                    icon=params.get("category_icon", "folder")
                )
                category = await self.category_service.create_category(user_id, category_data)
            
            # Create budget
            budget_data = BudgetCreate(
                category_id=category["id"],
                name=params["budget_name"],
                amount=params["amount"],
                currency=params.get("currency", "USD"),
                period_type=params["period_type"],
                start_date=params.get("start_date", date.today()),
                end_date=params.get("end_date"),
                alert_threshold=params.get("alert_threshold", 80)
            )
            
            budget = await self.budget_service.create_budget(user_id, budget_data)
            
            return ToolResult(
                True,
                f"Created budget \"{params['budget_name']}\" for category \"{params['category_name']}\"",
                {"budget": budget, "category": category}
            )
        except Exception as e:
            return ToolResult(False, f"Failed to create budget with category: {str(e)}")
    
    async def _get_receipt_items(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """Get receipt items (placeholder for now)"""
        try:
            # TODO: Implement receipt items functionality
            # For now, return placeholder message
            transaction_id = params.get("transaction_id")
            receipt_id = params.get("receipt_id")
            
            if transaction_id:
                # Check if transaction exists
                transaction = await self.transaction_service.get_transaction(user_id, transaction_id)
                if not transaction:
                    return ToolResult(False, "Transaction not found")
                
                return ToolResult(
                    True,
                    "Receipt items functionality not yet implemented",
                    {"transaction_id": transaction_id, "receipt_items": []}
                )
            
            return ToolResult(False, "Receipt ID or Transaction ID required")
        except Exception as e:
            return ToolResult(False, f"Failed to get receipt items: {str(e)}")