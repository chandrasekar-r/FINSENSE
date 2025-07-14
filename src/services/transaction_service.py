from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime
from src.config.database import DatabaseManager
from src.models.transaction import TransactionCreate, TransactionUpdate, TransactionFilter
from src.utils.logger import logger


class TransactionService:
    """Service for transaction-related operations"""
    
    async def get_transactions(self, user_id: str, filters: TransactionFilter) -> Dict[str, Any]:
        """Get user transactions with filtering and pagination"""
        try:
            # Build WHERE clause
            where_conditions = ["t.user_id = $1"]
            params = [uuid.UUID(user_id)]
            param_count = 2
            
            if filters.category_id:
                where_conditions.append(f"t.category_id = ${param_count}")
                # filters.category_id is already a UUID object from the API layer
                if isinstance(filters.category_id, str):
                    params.append(uuid.UUID(filters.category_id))
                else:
                    params.append(filters.category_id)
                param_count += 1
            
            if filters.transaction_type:
                where_conditions.append(f"t.transaction_type = ${param_count}")
                params.append(filters.transaction_type)
                param_count += 1
            
            if filters.start_date:
                where_conditions.append(f"t.transaction_date >= ${param_count}")
                # filters.start_date is already a datetime object from the API layer
                if isinstance(filters.start_date, str):
                    params.append(datetime.fromisoformat(filters.start_date.replace('Z', '+00:00')))
                else:
                    params.append(filters.start_date)
                param_count += 1
            
            if filters.end_date:
                where_conditions.append(f"t.transaction_date <= ${param_count}")
                # filters.end_date is already a datetime object from the API layer
                if isinstance(filters.end_date, str):
                    params.append(datetime.fromisoformat(filters.end_date.replace('Z', '+00:00')))
                else:
                    params.append(filters.end_date)
                param_count += 1
            
            if filters.vendor_name:
                where_conditions.append(f"t.vendor_name ILIKE ${param_count}")
                params.append(f"%{filters.vendor_name}%")
                param_count += 1
            
            # Calculate offset
            offset = (filters.page - 1) * filters.limit
            
            query = f"""
                SELECT 
                    t.id, t.user_id, t.category_id, t.vendor_name, t.amount, t.tax_amount,
                    t.currency, t.transaction_date, t.description, t.receipt_url,
                    t.transaction_type, t.created_at, t.updated_at,
                    c.name as category_name
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE {' AND '.join(where_conditions)}
                ORDER BY t.transaction_date DESC
                LIMIT ${param_count} OFFSET ${param_count + 1}
            """
            
            params.extend([filters.limit, offset])
            
            async with DatabaseManager(user_id) as db:
                # Get transactions with pagination
                rows = await db.fetch(query, *params)
                transactions = [dict(row) for row in rows]
                
                # Get total count for pagination
                count_query = f"""
                    SELECT COUNT(*) as total
                    FROM transactions t
                    LEFT JOIN categories c ON t.category_id = c.id
                    WHERE {' AND '.join(where_conditions)}
                """
                count_params = params[:-2]  # Remove limit and offset params
                total_result = await db.fetchrow(count_query, *count_params)
                total_count = total_result['total'] if total_result else 0
                
                return {
                    "transactions": transactions,
                    "total": total_count,
                    "page": filters.page,
                    "limit": filters.limit,
                    "total_pages": (total_count + filters.limit - 1) // filters.limit
                }
        
        except Exception as e:
            logger.error(f"Error getting transactions: {e}")
            raise e
    
    async def create_transaction(self, user_id: str, transaction_data: TransactionCreate) -> Dict[str, Any]:
        """Create a new transaction"""
        try:
            query = """
                INSERT INTO transactions 
                (user_id, category_id, vendor_name, amount, tax_amount, currency, 
                 transaction_date, description, transaction_type)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id, user_id, category_id, vendor_name, amount, tax_amount,
                         currency, transaction_date, description, receipt_url,
                         transaction_type, created_at, updated_at
            """
            
            async with DatabaseManager(user_id) as db:
                transaction = await db.fetchrow(
                    query,
                    uuid.UUID(user_id),
                    transaction_data.category_id,
                    transaction_data.vendor_name,
                    transaction_data.amount,
                    transaction_data.tax_amount or 0,
                    transaction_data.currency,
                    transaction_data.transaction_date,
                    transaction_data.description,
                    transaction_data.transaction_type
                )
                
                return dict(transaction)
        
        except Exception as e:
            logger.error(f"Error creating transaction: {e}")
            raise e
    
    async def get_transaction(self, user_id: str, transaction_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific transaction"""
        try:
            query = """
                SELECT 
                    t.id, t.user_id, t.category_id, t.vendor_name, t.amount, t.tax_amount,
                    t.currency, t.transaction_date, t.description, t.receipt_url,
                    t.transaction_type, t.created_at, t.updated_at,
                    c.name as category_name, c.color as category_color, c.icon as category_icon,
                    rp.id as receipt_id, rp.extracted_data
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                LEFT JOIN receipt_processing rp ON rp.transaction_id = t.id
                WHERE t.id = $1 AND t.user_id = $2
            """
            
            async with DatabaseManager(user_id) as db:
                transaction = await db.fetchrow(
                    query, 
                    uuid.UUID(transaction_id),
                    uuid.UUID(user_id)
                )
                
                if not transaction:
                    return None
                
                result = dict(transaction)
                
                # Process receipt data if it exists
                if result.get('extracted_data'):
                    try:
                        import json
                        # Parse the extracted_data JSON string
                        extracted_data = result['extracted_data']
                        if isinstance(extracted_data, str):
                            parsed_data = json.loads(extracted_data)
                        else:
                            parsed_data = extracted_data
                        
                        # Create receipt_details structure similar to frontend expectations
                        result['receipt_details'] = {
                            'extractedText': '',  # OCR text is not stored separately in current backend
                            'parsedData': parsed_data,
                            'parsed_data': parsed_data  # Also include snake_case version for compatibility
                        }
                        
                        # Clean up the raw extracted_data from the response
                        del result['extracted_data']
                        
                    except (json.JSONDecodeError, Exception) as e:
                        logger.warning(f"Failed to parse receipt extracted_data: {e}")
                        # Remove the raw extracted_data if it can't be parsed
                        del result['extracted_data']
                
                return result
        
        except Exception as e:
            logger.error(f"Error getting transaction: {e}")
            raise e
    
    async def update_transaction(
        self, 
        user_id: str, 
        transaction_id: str, 
        transaction_data: TransactionUpdate
    ) -> Optional[Dict[str, Any]]:
        """Update a transaction"""
        try:
            # Build dynamic update query
            update_fields = []
            params = []
            param_count = 1
            
            if transaction_data.vendor_name is not None:
                update_fields.append(f"vendor_name = ${param_count}")
                params.append(transaction_data.vendor_name)
                param_count += 1
            
            if transaction_data.amount is not None:
                update_fields.append(f"amount = ${param_count}")
                params.append(transaction_data.amount)
                param_count += 1
            
            if transaction_data.tax_amount is not None:
                update_fields.append(f"tax_amount = ${param_count}")
                params.append(transaction_data.tax_amount)
                param_count += 1
            
            if transaction_data.currency is not None:
                update_fields.append(f"currency = ${param_count}")
                params.append(transaction_data.currency)
                param_count += 1
            
            if transaction_data.transaction_date is not None:
                update_fields.append(f"transaction_date = ${param_count}")
                params.append(transaction_data.transaction_date)
                param_count += 1
            
            if transaction_data.description is not None:
                update_fields.append(f"description = ${param_count}")
                params.append(transaction_data.description)
                param_count += 1
            
            if transaction_data.category_id is not None:
                update_fields.append(f"category_id = ${param_count}")
                params.append(transaction_data.category_id)
                param_count += 1
            
            if transaction_data.transaction_type is not None:
                update_fields.append(f"transaction_type = ${param_count}")
                params.append(transaction_data.transaction_type)
                param_count += 1
            
            if not update_fields:
                # No fields to update
                return await self.get_transaction(user_id, transaction_id)
            
            # Add where clause parameters
            params.extend([uuid.UUID(transaction_id), uuid.UUID(user_id)])
            
            query = f"""
                UPDATE transactions 
                SET {', '.join(update_fields)}
                WHERE id = ${param_count} AND user_id = ${param_count + 1}
                RETURNING id, user_id, category_id, vendor_name, amount, tax_amount,
                         currency, transaction_date, description, receipt_url,
                         transaction_type, created_at, updated_at
            """
            
            async with DatabaseManager(user_id) as db:
                transaction = await db.fetchrow(query, *params)
                return dict(transaction) if transaction else None
        
        except Exception as e:
            logger.error(f"Error updating transaction: {e}")
            raise e
    
    async def delete_transaction(self, user_id: str, transaction_id: str) -> bool:
        """Delete a transaction"""
        try:
            query = "DELETE FROM transactions WHERE id = $1 AND user_id = $2"
            
            async with DatabaseManager(user_id) as db:
                result = await db.execute(
                    query,
                    uuid.UUID(transaction_id),
                    uuid.UUID(user_id)
                )
                
                # Check if any row was affected
                return result.split()[-1] == "1"
        
        except Exception as e:
            logger.error(f"Error deleting transaction: {e}")
            raise e
    
    async def get_spending_summary(
        self, 
        user_id: str, 
        start_date: Optional[str] = None, 
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get spending summary for a period"""
        try:
            where_conditions = ["user_id = $1"]
            params = [uuid.UUID(user_id)]
            param_count = 2
            
            if start_date:
                where_conditions.append(f"transaction_date >= ${param_count}")
                if isinstance(start_date, str):
                    params.append(datetime.fromisoformat(start_date.replace('Z', '+00:00')))
                else:
                    params.append(start_date)
                param_count += 1
            
            if end_date:
                where_conditions.append(f"transaction_date <= ${param_count}")
                if isinstance(end_date, str):
                    params.append(datetime.fromisoformat(end_date.replace('Z', '+00:00')))
                else:
                    params.append(end_date)
                param_count += 1
            
            query = f"""
                SELECT 
                    COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) as total_income,
                    COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
                    COUNT(*) as transaction_count
                FROM transactions
                WHERE {' AND '.join(where_conditions)}
            """
            
            async with DatabaseManager(user_id) as db:
                row = await db.fetchrow(query, *params)
                
                return {
                    "total_income": float(row["total_income"]),
                    "total_expenses": float(row["total_expenses"]),
                    "net_amount": float(row["total_income"]) - float(row["total_expenses"]),
                    "transaction_count": row["transaction_count"],
                    "period": f"{start_date or 'all time'} to {end_date or 'now'}"
                }
        
        except Exception as e:
            logger.error(f"Error getting spending summary: {e}")
            raise e
    
    async def get_category_summary(
        self, 
        user_id: str, 
        start_date: Optional[str] = None, 
        end_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get category breakdown for a period"""
        try:
            where_conditions = ["t.user_id = $1"]
            params = [uuid.UUID(user_id)]
            param_count = 2
            
            if start_date:
                where_conditions.append(f"t.transaction_date >= ${param_count}")
                params.append(datetime.fromisoformat(start_date.replace('Z', '+00:00')))
                param_count += 1
            
            if end_date:
                where_conditions.append(f"t.transaction_date <= ${param_count}")
                params.append(datetime.fromisoformat(end_date.replace('Z', '+00:00')))
                param_count += 1
            
            query = f"""
                SELECT 
                    t.category_id,
                    c.name as category_name,
                    c.color as category_color,
                    c.icon as category_icon,
                    SUM(t.amount) as total_amount,
                    COUNT(*) as transaction_count,
                    (SUM(t.amount) * 100.0 / NULLIF(SUM(SUM(t.amount)) OVER (), 0)) as percentage
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE {' AND '.join(where_conditions)} AND t.transaction_type = 'expense'
                GROUP BY t.category_id, c.name, c.color, c.icon
                ORDER BY total_amount DESC
            """
            
            async with DatabaseManager(user_id) as db:
                rows = await db.fetch(query, *params)
                
                return [
                    {
                        "category_id": row["category_id"],
                        "category_name": row["category_name"] or "Unknown",
                        "category_color": row["category_color"] or "#6B7280",
                        "category_icon": row["category_icon"] or "📁",
                        "total_amount": float(row["total_amount"]),
                        "transaction_count": row["transaction_count"],
                        "percentage": float(row["percentage"] or 0)
                    }
                    for row in rows
                ]
        
        except Exception as e:
            logger.error(f"Error getting category summary: {e}")
            raise e