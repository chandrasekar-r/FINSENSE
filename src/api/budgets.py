from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from src.models.budget import BudgetCreate, BudgetUpdate, BudgetResponse, BudgetStatus
from src.services.budget_service import BudgetService
from src.services.notification_service import NotificationService
from src.middleware.auth_middleware import get_current_user
from src.utils.logger import logger

router = APIRouter()


@router.get("/", response_model=List[BudgetResponse])
async def get_budgets(
    include_status: bool = Query(True, description="Include spending status calculations"),
    current_user: str = Depends(get_current_user)
):
    """Get user budgets with optional status information"""
    try:
        budget_service = BudgetService()
        budgets = await budget_service.get_budgets(current_user, include_status)
        
        logger.info(f"Retrieved {len(budgets)} budgets for user {current_user}")
        return budgets
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting budgets: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get budgets"
        )


@router.post("/", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
async def create_budget(
    budget_data: BudgetCreate,
    current_user: str = Depends(get_current_user)
):
    """Create a new budget"""
    try:
        budget_service = BudgetService()
        budget = await budget_service.create_budget(current_user, budget_data)
        return budget
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating budget: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create budget"
        )


@router.get("/{budget_id}", response_model=BudgetResponse)
async def get_budget(
    budget_id: str,
    current_user: str = Depends(get_current_user)
):
    """Get a specific budget with status"""
    try:
        budget_service = BudgetService()
        budget = await budget_service.get_budget_by_id(budget_id, current_user)
        
        if not budget:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Budget not found"
            )
        
        return budget
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting budget: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get budget"
        )


@router.put("/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: str,
    budget_data: BudgetUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update a budget"""
    try:
        budget_service = BudgetService()
        budget = await budget_service.update_budget(budget_id, current_user, budget_data)
        
        if not budget:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Budget not found"
            )
        
        return budget
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating budget: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update budget"
        )


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: str,
    current_user: str = Depends(get_current_user)
):
    """Delete a budget"""
    try:
        budget_service = BudgetService()
        success = await budget_service.delete_budget(budget_id, current_user)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Budget not found"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting budget: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete budget"
        )


@router.get("/{budget_id}/status", response_model=BudgetStatus)
async def get_budget_status(
    budget_id: str,
    current_user: str = Depends(get_current_user)
):
    """Get budget status with spending information and alerts"""
    try:
        budget_service = BudgetService()
        notification_service = NotificationService()
        
        status = await budget_service.get_budget_status(budget_id, current_user)
        
        if not status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Budget not found"
            )
        
        # Send notification if alert is triggered
        if status.alert_triggered:
            await notification_service.send_budget_alert(current_user, status)
        
        return status
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting budget status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get budget status"
        )