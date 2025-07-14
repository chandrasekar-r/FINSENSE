from typing import List, Dict, Any, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal
import uuid
from src.config.database import DatabaseManager
from src.models.budget import BudgetCreate, BudgetUpdate, BudgetStatus
from src.middleware.error_handler import create_error
from src.utils.logger import logger


class BudgetService:
    """Service for budget-related operations"""
    
    async def get_budgets(self, user_id: str, include_status: bool = True) -> List[Dict[str, Any]]:
        """Get user budgets with optional status calculation"""
        try:
            query = """
                SELECT 
                    b.id, b.user_id, b.category_id, b.name, b.amount, b.currency,
                    b.period_type, b.start_date, b.end_date, b.alert_threshold,
                    b.is_active, b.created_at, b.updated_at,
                    c.name as category_name,
                    c.color as category_color,
                    c.icon as category_icon
                FROM budgets b
                LEFT JOIN categories c ON b.category_id = c.id
                WHERE b.user_id = $1
                ORDER BY b.created_at DESC
            """
            
            async with DatabaseManager(user_id) as db:
                rows = await db.fetch(query, uuid.UUID(user_id))
                budgets = [dict(row) for row in rows]
                
                if include_status:
                    # Calculate status for each budget
                    for budget in budgets:
                        status = await self._calculate_budget_status(budget, db)
                        budget.update(status)
                
                logger.info(f"Retrieved {len(budgets)} budgets for user {user_id}")
                return budgets
        
        except Exception as e:
            logger.error(f"Error getting budgets: {e}")
            raise create_error("Failed to retrieve budgets", 500)
    
    async def create_budget(self, user_id: str, budget_data: BudgetCreate) -> Dict[str, Any]:
        """Create a new budget"""
        try:
            # Calculate end_date if not provided
            end_date = budget_data.end_date or self._calculate_end_date(
                budget_data.start_date, 
                budget_data.period_type
            )
            
            query = """
                INSERT INTO budgets (
                    user_id, category_id, name, amount, currency, period_type,
                    start_date, end_date, alert_threshold, is_active
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id, user_id, category_id, name, amount, currency,
                         period_type, start_date, end_date, alert_threshold,
                         is_active, created_at, updated_at
            """
            
            async with DatabaseManager(user_id) as db:
                budget = await db.fetchrow(
                    query,
                    uuid.UUID(user_id),
                    budget_data.category_id,
                    budget_data.name,
                    budget_data.amount,
                    budget_data.currency,
                    budget_data.period_type,
                    budget_data.start_date,
                    end_date,
                    budget_data.alert_threshold,
                    True
                )
                
                logger.info(f"Budget created successfully: {budget['id']}")
                return dict(budget)
        
        except Exception as e:
            logger.error(f"Error creating budget: {e}")
            raise create_error("Failed to create budget", 500)
    
    async def get_budget_by_id(self, budget_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific budget with status"""
        try:
            query = """
                SELECT 
                    b.id, b.user_id, b.category_id, b.name, b.amount, b.currency,
                    b.period_type, b.start_date, b.end_date, b.alert_threshold,
                    b.is_active, b.created_at, b.updated_at,
                    c.name as category_name,
                    c.color as category_color,
                    c.icon as category_icon
                FROM budgets b
                LEFT JOIN categories c ON b.category_id = c.id
                WHERE b.id = $1 AND b.user_id = $2
            """
            
            async with DatabaseManager(user_id) as db:
                budget = await db.fetchrow(
                    query,
                    uuid.UUID(budget_id),
                    uuid.UUID(user_id)
                )
                
                if not budget:
                    return None
                
                budget_dict = dict(budget)
                status = await self._calculate_budget_status(budget_dict, db)
                budget_dict.update(status)
                
                return budget_dict
        
        except Exception as e:
            logger.error(f"Error getting budget: {e}")
            raise create_error("Failed to retrieve budget", 500)
    
    async def update_budget(
        self, 
        budget_id: str, 
        user_id: str, 
        budget_data: BudgetUpdate
    ) -> Optional[Dict[str, Any]]:
        """Update a budget"""
        try:
            # Build dynamic update query
            update_fields = []
            params = []
            param_count = 1
            
            update_data = budget_data.dict(exclude_unset=True)
            
            for field, value in update_data.items():
                if value is not None:
                    update_fields.append(f"{field} = ${param_count}")
                    params.append(value)
                    param_count += 1
            
            if not update_fields:
                raise create_error("No data provided for update", 400)
            
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            
            # Add where clause parameters
            params.extend([uuid.UUID(budget_id), uuid.UUID(user_id)])
            
            query = f"""
                UPDATE budgets
                SET {', '.join(update_fields)}
                WHERE id = ${param_count} AND user_id = ${param_count + 1}
                RETURNING id, user_id, category_id, name, amount, currency,
                         period_type, start_date, end_date, alert_threshold,
                         is_active, created_at, updated_at
            """
            
            async with DatabaseManager(user_id) as db:
                budget = await db.fetchrow(query, *params)
                
                if not budget:
                    raise create_error("Budget not found", 404)
                
                logger.info(f"Budget updated successfully: {budget_id}")
                return dict(budget)
        
        except Exception as e:
            logger.error(f"Error updating budget: {e}")
            if "Budget not found" in str(e):
                raise e
            raise create_error("Failed to update budget", 500)
    
    async def delete_budget(self, budget_id: str, user_id: str) -> bool:
        """Delete a budget"""
        try:
            query = """
                DELETE FROM budgets
                WHERE id = $1 AND user_id = $2
            """
            
            async with DatabaseManager(user_id) as db:
                result = await db.execute(
                    query,
                    uuid.UUID(budget_id),
                    uuid.UUID(user_id)
                )
                
                # Check if any row was affected
                success = result.split()[-1] == "1"
                
                if not success:
                    raise create_error("Budget not found", 404)
                
                logger.info(f"Budget deleted successfully: {budget_id}")
                return True
        
        except Exception as e:
            logger.error(f"Error deleting budget: {e}")
            if "Budget not found" in str(e):
                raise e
            raise create_error("Failed to delete budget", 500)
    
    async def get_budget_status(self, budget_id: str, user_id: str) -> Optional[BudgetStatus]:
        """Get budget status with spending information"""
        try:
            budget = await self.get_budget_by_id(budget_id, user_id)
            
            if not budget:
                return None
            
            return BudgetStatus(
                id=budget["id"],
                name=budget["name"],
                budget_amount=budget["budget_amount"],
                spent_amount=budget["spent_amount"],
                remaining_amount=budget["remaining_amount"],
                percentage_used=budget["percentage_used"],
                days_remaining=budget["days_remaining"],
                alert_triggered=budget["alert_triggered"],
                status=budget["status"],
                category_name=budget["category_name"],
                period_type=budget["period_type"],
                currency=budget["currency"]
            )
        
        except Exception as e:
            logger.error(f"Error getting budget status: {e}")
            raise create_error("Failed to get budget status", 500)
    
    async def check_all_budgets_for_alerts(self, user_id: str) -> List[BudgetStatus]:
        """Check all budgets for alert conditions"""
        try:
            budgets = await self.get_budgets(user_id, include_status=True)
            
            alert_budgets = []
            for budget in budgets:
                if budget.get("alert_triggered"):
                    alert_budgets.append(BudgetStatus(
                        id=budget["id"],
                        name=budget["name"],
                        budget_amount=budget["budget_amount"],
                        spent_amount=budget["spent_amount"],
                        remaining_amount=budget["remaining_amount"],
                        percentage_used=budget["percentage_used"],
                        days_remaining=budget["days_remaining"],
                        alert_triggered=budget["alert_triggered"],
                        status=budget["status"],
                        category_name=budget["category_name"],
                        period_type=budget["period_type"],
                        currency=budget["currency"]
                    ))
            
            return alert_budgets
        
        except Exception as e:
            logger.error(f"Error checking budget alerts: {e}")
            raise create_error("Failed to check budget alerts", 500)
    
    async def _calculate_budget_status(self, budget: Dict[str, Any], db) -> Dict[str, Any]:
        """Calculate budget spending status"""
        try:
            # Calculate spent amount in the budget period
            spent_query = """
                SELECT COALESCE(SUM(amount), 0) as spent_amount
                FROM transactions
                WHERE user_id = $1 
                  AND category_id = $2
                  AND transaction_date >= $3
                  AND transaction_date <= $4
                  AND transaction_type = 'expense'
            """
            
            spent_result = await db.fetchrow(
                spent_query,
                budget["user_id"],
                budget["category_id"],
                budget["start_date"],
                budget["end_date"]
            )
            
            spent_amount = Decimal(str(spent_result["spent_amount"]))
            budget_amount = Decimal(str(budget["amount"]))
            remaining_amount = budget_amount - spent_amount
            percentage_used = float((spent_amount / budget_amount) * 100) if budget_amount > 0 else 0
            
            # Calculate days remaining
            end_date = budget["end_date"]
            if isinstance(end_date, str):
                end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
            
            today = date.today()
            days_remaining = max(0, (end_date - today).days)
            
            # Determine status and alert
            status = "on_track"
            alert_triggered = False
            alert_threshold = budget.get("alert_threshold", 80)
            
            if percentage_used >= 100:
                status = "over_budget"
                alert_triggered = True
            elif percentage_used >= alert_threshold:
                status = "warning"
                alert_triggered = True
            
            return {
                "budget_amount": budget_amount,
                "spent_amount": spent_amount,
                "remaining_amount": remaining_amount,
                "percentage_used": round(percentage_used, 2),
                "days_remaining": days_remaining,
                "alert_triggered": alert_triggered,
                "status": status
            }
        
        except Exception as e:
            logger.error(f"Error calculating budget status: {e}")
            raise create_error("Failed to calculate budget status", 500)
    
    def _calculate_end_date(self, start_date: date, period_type: str) -> date:
        """Calculate end date based on period type"""
        if period_type == "weekly":
            return start_date + timedelta(days=7)
        elif period_type == "monthly":
            # Add one month
            if start_date.month == 12:
                return start_date.replace(year=start_date.year + 1, month=1)
            else:
                return start_date.replace(month=start_date.month + 1)
        elif period_type == "yearly":
            return start_date.replace(year=start_date.year + 1)
        else:
            # Default to monthly
            return start_date.replace(month=start_date.month + 1)