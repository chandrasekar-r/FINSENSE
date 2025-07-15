"""Transaction-related AI tools for financial operations."""

from typing import Dict, Any
from datetime import date
from src.tools.base import BaseTool, ToolResult
from src.tools.models import TransactionCreateParams, TransactionUpdateParams, TransactionFilterParams, SpendingAnalysisParams
from src.services.transaction_service import TransactionService
from src.models.transaction import TransactionCreate, TransactionUpdate, TransactionFilter


class TransactionTools(BaseTool):
    """Tools for managing transactions."""
    
    def __init__(self):
        super().__init__()
        self.transaction_service = TransactionService()
    
    async def add_transaction(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """
        Add a new transaction (expense or income).
        
        Args:
            params: Transaction parameters including amount, description, category_id, etc.
            user_id: The user ID for the transaction
            
        Returns:
            ToolResult with success status and transaction details
        """
        try:
            # Validate parameters
            validated_params = TransactionCreateParams(**params)
            
            transaction_data = TransactionCreate(
                vendor_name=validated_params.merchant_name or validated_params.description,
                amount=validated_params.amount,
                currency="USD",  # Default currency, could be parameterized
                transaction_date=validated_params.transaction_date or date.today(),
                description=validated_params.description,
                transaction_type=validated_params.transaction_type,
                category_id=validated_params.category_id
            )
            
            transaction = await self.transaction_service.create_transaction(user_id, transaction_data)
            
            return ToolResult(
                True,
                f"Added {validated_params.transaction_type} transaction: ${validated_params.amount} for {validated_params.description}",
                transaction
            )
        except Exception as e:
            return ToolResult(False, f"Failed to add transaction: {str(e)}")
    
    async def update_transaction(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """
        Update an existing transaction.
        
        Args:
            params: Update parameters including transaction_id and optional fields to update
            user_id: The user ID for the transaction
            
        Returns:
            ToolResult with success status and updated transaction details
        """
        try:
            validated_params = TransactionUpdateParams(**params)
            
            update_data = TransactionUpdate()
            
            if validated_params.amount is not None:
                update_data.amount = validated_params.amount
            if validated_params.description is not None:
                update_data.description = validated_params.description
            if validated_params.category_id is not None:
                update_data.category_id = validated_params.category_id
            if validated_params.transaction_type is not None:
                update_data.transaction_type = validated_params.transaction_type
            if validated_params.merchant_name is not None:
                update_data.vendor_name = validated_params.merchant_name
            
            transaction = await self.transaction_service.update_transaction(
                user_id, validated_params.transaction_id, update_data
            )
            
            if not transaction:
                return ToolResult(False, "Transaction not found")
            
            return ToolResult(True, "Updated transaction successfully", transaction)
        except Exception as e:
            return ToolResult(False, f"Failed to update transaction: {str(e)}")
    
    async def delete_transaction(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """
        Delete a transaction.
        
        Args:
            params: Parameters containing transaction_id
            user_id: The user ID for the transaction
            
        Returns:
            ToolResult with success status
        """
        try:
            transaction_id = params.get("transaction_id")
            if not transaction_id:
                return ToolResult(False, "Transaction ID is required")
            
            success = await self.transaction_service.delete_transaction(user_id, transaction_id)
            
            if not success:
                return ToolResult(False, "Transaction not found")
            
            return ToolResult(True, "Deleted transaction successfully")
        except Exception as e:
            return ToolResult(False, f"Failed to delete transaction: {str(e)}")
    
    async def get_transactions(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """
        Get transactions with optional filters. Use this as a FIRST step when users ask about purchases.
        
        Args:
            params: Filter parameters including date ranges, categories, etc.
            user_id: The user ID for the transactions
            
        Returns:
            ToolResult with list of transactions
            
        IMPORTANT: After getting transactions, ALWAYS follow up with get_receipt_items 
        for each transaction_id if the user asks about specific items they purchased.
        """
        try:
            validated_params = TransactionFilterParams(**params)
            
            filters = TransactionFilter(
                start_date=validated_params.start_date,
                end_date=validated_params.end_date,
                transaction_type=validated_params.transaction_type,
                vendor_name=validated_params.merchant,
                limit=validated_params.limit
            )
            
            # Add category filter if provided - we'll handle category name to ID mapping
            category_id = None
            if validated_params.category:
                # Get category ID from category name
                from src.services.category_service import CategoryService
                category_service = CategoryService()
                categories = await category_service.get_user_categories(user_id)
                
                # Find category by name (case-insensitive)
                for cat in categories:
                    if cat['name'].lower() == validated_params.category.lower():
                        category_id = cat['id']
                        break
                
                if category_id:
                    filters.category_id = category_id
            
            transactions_result = await self.transaction_service.get_transactions(user_id, filters)
            transactions = transactions_result.get('transactions', [])
            
            return ToolResult(
                True,
                f"Found {len(transactions)} transactions",
                {
                    "transactions": transactions,
                    "total": len(transactions),
                    "page": 1,
                    "limit": validated_params.limit
                }
            )
        except Exception as e:
            return ToolResult(False, f"Failed to get transactions: {str(e)}")
    
    async def get_spending_analysis(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """
        Get detailed spending analysis and insights.
        
        Args:
            params: Analysis parameters including period
            user_id: The user ID for the analysis
            
        Returns:
            ToolResult with spending analysis data
        """
        try:
            validated_params = SpendingAnalysisParams(**params)
            period = validated_params.period
            
            # Get spending summary and category breakdown
            summary = await self.transaction_service.get_spending_summary(user_id)
            category_summary = await self.transaction_service.get_category_summary(user_id)
            
            return ToolResult(
                True,
                f"Spending analysis for {period}",
                {
                    "summary": summary,
                    "category_breakdown": category_summary,
                    "period": period
                }
            )
        except Exception as e:
            return ToolResult(False, f"Failed to get spending analysis: {str(e)}")
