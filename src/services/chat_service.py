from typing import Dict, Any, List, Optional, Callable
import uuid
import json
from src.config.database import DatabaseManager
from src.ai.deepseek_service import DeepSeekService
from src.services.tool_service import ToolService
from src.services.transaction_service import TransactionService
from src.services.budget_service import BudgetService
from src.services.category_service import CategoryService
from src.utils.logger import logger


class ChatService:
    """Service for AI chat functionality"""
    
    def __init__(self):
        self.deepseek_service = DeepSeekService()
        self.tool_service = ToolService()
        self.transaction_service = TransactionService()
        self.budget_service = BudgetService()
        self.category_service = CategoryService()
    
    async def process_message(self, user_id: str, message: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Process a chat message and return AI response"""
        try:
            # Build financial context
            financial_context = await self._build_financial_context(user_id)
            
            # Process with DeepSeek
            response = await self.deepseek_service.process_financial_query(
                message=message,
                context=financial_context,
                user_id=user_id,
                tool_service=self.tool_service
            )
            
            # Store chat history
            await self._store_chat_history(user_id, message, response)
            
            return response
        
        except Exception as e:
            logger.error(f"Error processing chat message: {e}")
            error_response = "I'm sorry, I encountered an error processing your request. Please try again."
            await self._store_chat_history(user_id, message, error_response)
            return error_response
    
    async def process_message_stream(
        self, 
        user_id: str, 
        message: str, 
        on_chunk: Callable[[str], None],
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """Process a chat message with streaming response"""
        try:
            # Build financial context
            financial_context = await self._build_financial_context(user_id)
            
            # Get chat history
            history = await self._get_recent_chat_history(user_id, limit=5)
            
            # This will be handled by the DeepSeek service with proper status messages
            # No need to send initial message here
            
            # Process with streaming DeepSeek
            logger.info(f"Starting DeepSeek streaming query for user {user_id}")
            await self.deepseek_service.process_financial_query_stream(
                message=message,
                context=financial_context,
                on_chunk=on_chunk,
                user_id=user_id,
                history=history,
                tool_service=self.tool_service
            )
            logger.info(f"Completed DeepSeek streaming query for user {user_id}")
            
            # Note: For streaming, we'll store the complete response after streaming is done
            # This would require capturing the streamed content
            
        except Exception as e:
            logger.error(f"Error processing streaming chat message: {e}")
            on_chunk(json.dumps({
                "type": "error", 
                "message": "I'm sorry, I encountered an error processing your request."
            }))
    
    async def get_chat_history(self, user_id: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Get chat history for user"""
        try:
            query = """
                SELECT id, user_id, message, response, function_calls, created_at
                FROM chat_history
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
            """
            
            async with DatabaseManager(user_id) as db:
                rows = await db.fetch(query, uuid.UUID(user_id), limit, offset)
                return [dict(row) for row in rows]
        
        except Exception as e:
            logger.error(f"Error getting chat history: {e}")
            return []
    
    async def clear_chat_history(self, user_id: str) -> bool:
        """Clear all chat history for user"""
        try:
            query = """
                DELETE FROM chat_history
                WHERE user_id = $1
            """
            
            async with DatabaseManager(user_id) as db:
                result = await db.execute(query, uuid.UUID(user_id))
                logger.info(f"Cleared chat history for user {user_id}")
                return True
        
        except Exception as e:
            logger.error(f"Error clearing chat history: {e}")
            return False
    
    async def _build_financial_context(self, user_id: str) -> Dict[str, Any]:
        """Build comprehensive financial context for AI"""
        try:
            # Get recent transactions with receipt data
            from src.models.transaction import TransactionFilter
            recent_filter = TransactionFilter(limit=15)
            transaction_result = await self.transaction_service.get_transactions(user_id, recent_filter)
            # Extract transactions list from paginated response
            recent_transactions = transaction_result.get('transactions', []) if isinstance(transaction_result, dict) else transaction_result
            
            # Get spending summary with category breakdown
            spending_summary = await self.transaction_service.get_spending_summary(user_id)
            
            # Get budgets with detailed status
            budgets = await self.budget_service.get_budgets(user_id, include_status=True)
            
            # Get categories
            categories = await self.category_service.get_user_categories(user_id)
            
            # Get grocery-specific insights
            grocery_transactions = [t for t in recent_transactions if t.get('category_name', '').lower() in ['groceries', 'food', 'supermarket']]
            
            # Calculate grocery spending insights
            grocery_total = sum(t.get('amount', 0) for t in grocery_transactions)
            
            return {
                "totalSpending": spending_summary.get("total_expenses", 0),
                "recentTransactions": recent_transactions,
                "budgets": budgets,
                "categories": categories,
                "spendingSummary": spending_summary,
                "grocerySpending": grocery_total,
                "groceryTransactions": grocery_transactions
            }
        
        except Exception as e:
            logger.error(f"Error building financial context: {e}")
            return {
                "totalSpending": 0,
                "recentTransactions": [],
                "budgets": [],
                "categories": [],
                "spendingSummary": {},
                "grocerySpending": 0,
                "groceryTransactions": []
            }
    
    async def _store_chat_history(self, user_id: str, message: str, response: str, function_calls: Optional[Dict] = None) -> None:
        """Store chat message and response in history"""
        try:
            query = """
                INSERT INTO chat_history (user_id, message, response, function_calls)
                VALUES ($1, $2, $3, $4)
            """
            
            async with DatabaseManager(user_id) as db:
                await db.execute(
                    query,
                    uuid.UUID(user_id),
                    message,
                    response,
                    json.dumps(function_calls) if function_calls else None
                )
        
        except Exception as e:
            logger.error(f"Error storing chat history: {e}")
            # Don't raise error as this shouldn't break the main flow
    
    async def _get_recent_chat_history(self, user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get recent chat history for context"""
        try:
            query = """
                SELECT message as user_message, response as ai_response
                FROM chat_history
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2
            """
            
            async with DatabaseManager(user_id) as db:
                rows = await db.fetch(query, uuid.UUID(user_id), limit)
                # Reverse to get chronological order
                return [dict(row) for row in reversed(rows)]
        
        except Exception as e:
            logger.error(f"Error getting recent chat history: {e}")
            return []