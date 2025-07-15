"""Main orchestrating service for AI tools."""

from typing import Dict, Any, List
from src.tools.base import ToolResult
from src.tools.transaction_tools import TransactionTools
from src.tools.budget_tools import BudgetTools
from src.tools.category_tools import CategoryTools
from src.tools.receipt_tools import ReceiptTools
from src.tools.models import ToolDefinition
from src.utils.logger import logger


class ToolService:
    """
    Main orchestrating service for AI function calling tools.
    
    This service provides a unified interface for all AI tools used in
    financial operations. It maintains backward compatibility with the
    original tool_service.py while providing better organization and
    documentation.
    
    The service combines tools for:
    - Transaction management (add, update, delete, retrieve)
    - Budget management (create, update, delete, retrieve)
    - Category management (create, retrieve)
    - Receipt data management (item retrieval, receipt-transaction linking)
    """
    
    def __init__(self):
        self.logger = logger
        self.transaction_tools = TransactionTools()
        self.budget_tools = BudgetTools()
        self.category_tools = CategoryTools()
        self.receipt_tools = ReceiptTools()
    
    def get_available_tools(self) -> List[Dict[str, Any]]:
        """
        Get all available tools for AI function calling.
        
        Returns:
            List of tool definitions with name, description, and parameters
            for use with AI function calling APIs
        """
        tools = [
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
            },
            {
                "name": "get_receipts_by_transaction",
                "description": "Get all receipts associated with a specific transaction",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "transaction_id": {"type": "string", "description": "Transaction ID to find receipts for"}
                    },
                    "required": ["transaction_id"]
                }
            }
        ]
        
        return tools
    
    async def execute_tool(self, tool_name: str, parameters: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """
        Execute a tool and return result.
        
        Args:
            tool_name: Name of the tool to execute
            parameters: Parameters for the tool
            user_id: User ID for the operation
            
        Returns:
            Dictionary with success status, message, and optional data
        """
        try:
            self.logger.info(f"Executing tool: {tool_name} with params: {parameters}")
            
            # Route to appropriate tool
            if tool_name == "add_transaction":
                result = await self.transaction_tools.add_transaction(parameters, user_id)
            elif tool_name == "update_transaction":
                result = await self.transaction_tools.update_transaction(parameters, user_id)
            elif tool_name == "delete_transaction":
                result = await self.transaction_tools.delete_transaction(parameters, user_id)
            elif tool_name == "create_budget":
                result = await self.budget_tools.create_budget(parameters, user_id)
            elif tool_name == "update_budget":
                result = await self.budget_tools.update_budget(parameters, user_id)
            elif tool_name == "delete_budget":
                result = await self.budget_tools.delete_budget(parameters, user_id)
            elif tool_name == "create_category":
                result = await self.category_tools.create_category(parameters, user_id)
            elif tool_name == "get_transactions":
                result = await self.transaction_tools.get_transactions(parameters, user_id)
            elif tool_name == "get_spending_analysis":
                result = await self.transaction_tools.get_spending_analysis(parameters, user_id)
            elif tool_name == "get_budgets":
                result = await self.budget_tools.get_budgets(parameters, user_id)
            elif tool_name == "create_budget_with_category":
                result = await self.budget_tools.create_budget_with_category(parameters, user_id)
            elif tool_name == "get_receipt_items":
                result = await self.receipt_tools.get_receipt_items(parameters, user_id)
            elif tool_name == "get_receipts_by_transaction":
                result = await self.receipt_tools.get_receipts_by_transaction(parameters.get("transaction_id", ""), user_id)
            else:
                result = ToolResult(False, f"Unknown tool: {tool_name}")
            
            # Ensure result is a ToolResult
            if not isinstance(result, ToolResult):
                self.logger.error(f"Tool {tool_name} returned unexpected type: {type(result)} - {result}")
                return ToolResult(False, f"Tool returned invalid result type: {type(result).__name__}").to_dict()
            
            result_dict = result.to_dict()
            self.logger.info(f"Tool {tool_name} result dict: {result_dict}")
            return result_dict
        
        except Exception as e:
            self.logger.error(f"Tool execution error ({tool_name}): {e}")
            return ToolResult(False, f"Tool execution failed: {str(e)}").to_dict()
