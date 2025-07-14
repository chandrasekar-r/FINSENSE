"""Receipt-related AI tools for financial operations."""

from typing import Dict, Any, List
from src.tools.base import BaseTool, ToolResult
from src.tools.models import ReceiptItemParams
from src.config.database import DatabaseManager
from src.utils.logger import logger


class ReceiptTools(BaseTool):
    """Tools for managing receipt data and items."""
    
    def __init__(self):
        super().__init__()
    
    async def get_receipt_items(self, params: Dict[str, Any], user_id: str) -> ToolResult:
        """
        Get detailed individual items from a scanned receipt.
        
        This tool is MANDATORY when users ask about:
        - Specific items they bought
        - What was on their receipt
        - Individual product details
        - Itemized breakdown of purchases
        - "Show me the detailed receipt"
        
        Args:
            params: Parameters including receipt_id or transaction_id
            user_id: The user ID for the receipt data
            
        Returns:
            ToolResult with detailed receipt items
        """
        try:
            validated_params = ReceiptItemParams(**params)
            
            # Determine which ID to use
            transaction_id = validated_params.transaction_id
            receipt_id = validated_params.receipt_id
            
            if not transaction_id and not receipt_id:
                return ToolResult(False, "Either transaction_id or receipt_id is required")
            
            # Query to get receipt items
            async with DatabaseManager(user_id) as db:
                if transaction_id:
                    # Get items by transaction_id
                    query = """
                        SELECT 
                            tli.id,
                            tli.item_name as name,
                            tli.quantity,
                            tli.unit_price as price,
                            tli.total_price as amount,
                            t.vendor_name as merchant_name,
                            t.transaction_date as date,
                            t.amount as total_amount,
                            t.currency,
                            c.name as category_name
                        FROM transaction_line_items tli
                        JOIN transactions t ON tli.transaction_id = t.id
                        LEFT JOIN categories c ON t.category_id = c.id
                        WHERE tli.transaction_id = $1 AND t.user_id = $2
                        ORDER BY tli.id
                    """
                    items = await db.fetch(query, uuid.UUID(transaction_id), uuid.UUID(user_id))
                    
                    if not items:
                        # Check if transaction exists
                        transaction_query = """
                            SELECT t.vendor_name, t.transaction_date, t.amount, t.currency, c.name as category_name
                            FROM transactions t
                            LEFT JOIN categories c ON t.category_id = c.id
                            WHERE t.id = $1 AND t.user_id = $2
                        """
                        transaction = await db.fetchrow(transaction_query, uuid.UUID(transaction_id), uuid.UUID(user_id))
                        
                        if not transaction:
                            return ToolResult(False, "Transaction not found")
                        
                        return ToolResult(
                            True,
                            "No detailed receipt items found for this transaction",
                            {
                                "transaction_id": transaction_id,
                                "merchant": transaction["vendor_name"],
                                "date": transaction["transaction_date"],
                                "total_amount": transaction["amount"],
                                "currency": transaction["currency"],
                                "category": transaction["category_name"],
                                "receipt_items": []
                            }
                        )
                    
                    # Format the response
                    transaction = items[0]  # All items belong to same transaction
                    receipt_items = [
                        {
                            "id": str(item["id"]),
                            "name": item["name"],
                            "quantity": float(item["quantity"]),
                            "price": float(item["price"]),
                            "amount": float(item["amount"]),
                            "category": item["category_name"]
                        }
                        for item in items
                    ]
                    
                    return ToolResult(
                        True,
                        f"Found {len(receipt_items)} receipt items",
                        {
                            "transaction_id": transaction_id,
                            "merchant": transaction["merchant_name"],
                            "date": transaction["date"],
                            "total_amount": transaction["total_amount"],
                            "currency": transaction["currency"],
                            "category": transaction["category_name"],
                            "receipt_items": receipt_items
                        }
                    )
                
                elif receipt_id:
                    # Get items by receipt_id (from receipt_processing table)
                    query = """
                        SELECT 
                            rp.extracted_data,
                            rp.transaction_id
                        FROM receipt_processing rp
                        WHERE rp.id = $1 AND rp.user_id = $2
                    """
                    receipt = await db.fetchrow(query, uuid.UUID(receipt_id), uuid.UUID(user_id))
                    
                    if not receipt:
                        return ToolResult(False, "Receipt not found")
                    
                    extracted_data = receipt["extracted_data"]
                    if not extracted_data or "items" not in extracted_data:
                        return ToolResult(
                            True,
                            "No receipt items found",
                            {
                                "receipt_id": receipt_id,
                                "transaction_id": str(receipt["transaction_id"]) if receipt["transaction_id"] else None,
                                "receipt_items": []
                            }
                        )
                    
                    # Format items from extracted data
                    items = extracted_data.get("items", [])
                    receipt_items = [
                        {
                            "name": item.get("name", "Unknown Item"),
                            "quantity": float(item.get("quantity", 1)),
                            "price": float(item.get("price", item.get("amount", 0))),
                            "amount": float(item.get("amount", 0)),
                            "category": item.get("category", "other")
                        }
                        for item in items
                    ]
                    
                    return ToolResult(
                        True,
                        f"Found {len(receipt_items)} receipt items",
                        {
                            "receipt_id": receipt_id,
                            "transaction_id": str(receipt["transaction_id"]) if receipt["transaction_id"] else None,
                            "merchant": extracted_data.get("merchantName", "Unknown"),
                            "date": extracted_data.get("date", "Unknown"),
                            "total_amount": extracted_data.get("totalAmount", 0),
                            "currency": extracted_data.get("currency", "USD"),
                            "receipt_items": receipt_items
                        }
                    )
        
        except Exception as e:
            logger.error(f"Failed to get receipt items: {e}")
            return ToolResult(False, f"Failed to get receipt items: {str(e)}")
    
    async def get_receipts_by_transaction(self, transaction_id: str, user_id: str) -> ToolResult:
        """
        Get all receipts associated with a transaction.
        
        Args:
            transaction_id: The transaction ID
            user_id: The user ID
            
        Returns:
            ToolResult with list of receipts for the transaction
        """
        try:
            async with DatabaseManager(user_id) as db:
                query = """
                    SELECT 
                        rp.id,
                        rp.file_name,
                        rp.extracted_data,
                        rp.confidence_score,
                        rp.created_at,
                        rp.processing_status
                    FROM receipt_processing rp
                    WHERE rp.transaction_id = $1 AND rp.user_id = $2
                    ORDER BY rp.created_at DESC
                """
                receipts = await db.fetch(query, uuid.UUID(transaction_id), uuid.UUID(user_id))
                
                if not receipts:
                    return ToolResult(
                        True,
                        "No receipts found for this transaction",
                        {"transaction_id": transaction_id, "receipts": []}
                    )
                
                formatted_receipts = [
                    {
                        "id": str(receipt["id"]),
                        "file_name": receipt["file_name"],
                        "extracted_data": receipt["extracted_data"],
                        "confidence_score": receipt["confidence_score"],
                        "created_at": receipt["created_at"].isoformat() if receipt["created_at"] else None,
                        "processing_status": receipt["processing_status"]
                    }
                    for receipt in receipts
                ]
                
                return ToolResult(
                    True,
                    f"Found {len(formatted_receipts)} receipts for transaction",
                    {"transaction_id": transaction_id, "receipts": formatted_receipts}
                )
        
        except Exception as e:
            logger.error(f"Failed to get receipts by transaction: {e}")
            return ToolResult(False, f"Failed to get receipts by transaction: {str(e)}")
