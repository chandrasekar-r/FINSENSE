from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
import uuid as uuid_module
from src.models.transaction import (
    TransactionCreate, 
    TransactionUpdate, 
    TransactionResponse,
    TransactionFilter,
    TransactionAPIResponse,
    SpendingSummary,
    CategorySummary
)
from src.services.transaction_service import TransactionService
from src.middleware.auth_middleware import get_current_user
from src.utils.logger import logger

router = APIRouter()


@router.get("/", response_model=TransactionAPIResponse)
async def get_transactions(
    category_id: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    vendor_name: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: str = Depends(get_current_user)
):
    """Get user transactions with filtering and pagination"""
    try:
        transaction_service = TransactionService()
        
        # Parse and validate filter parameters
        parsed_category_id = None
        if category_id:
            try:
                parsed_category_id = uuid_module.UUID(category_id)
            except (ValueError, TypeError):
                logger.warning(f"Invalid category_id format: {category_id}")
                parsed_category_id = None
        
        parsed_start_date = None
        if start_date:
            try:
                parsed_start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except (ValueError, TypeError):
                logger.warning(f"Invalid start_date format: {start_date}")
        
        parsed_end_date = None
        if end_date:
            try:
                parsed_end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except (ValueError, TypeError):
                logger.warning(f"Invalid end_date format: {end_date}")
        
        # Create filter object
        filters = TransactionFilter(
            category_id=parsed_category_id,
            transaction_type=transaction_type,
            start_date=parsed_start_date,
            end_date=parsed_end_date,
            vendor_name=vendor_name,
            page=page,
            limit=limit
        )
        
        result = await transaction_service.get_transactions(current_user, filters)
        return {
            "success": True,
            "data": result
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting transactions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get transactions"
        )


@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction_data: TransactionCreate,
    current_user: str = Depends(get_current_user)
):
    """Create a new transaction"""
    try:
        transaction_service = TransactionService()
        transaction = await transaction_service.create_transaction(current_user, transaction_data)
        return transaction
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating transaction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create transaction"
        )


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: str = Depends(get_current_user)
):
    """Get a specific transaction"""
    try:
        transaction_service = TransactionService()
        transaction = await transaction_service.get_transaction(current_user, transaction_id)
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        return transaction
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting transaction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get transaction"
        )


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    transaction_data: TransactionUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update a transaction"""
    try:
        transaction_service = TransactionService()
        transaction = await transaction_service.update_transaction(
            current_user, transaction_id, transaction_data
        )
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        return transaction
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating transaction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update transaction"
        )


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: str,
    current_user: str = Depends(get_current_user)
):
    """Delete a transaction"""
    try:
        transaction_service = TransactionService()
        success = await transaction_service.delete_transaction(current_user, transaction_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting transaction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete transaction"
        )


@router.get("/summary/spending", response_model=SpendingSummary)
async def get_spending_summary(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: str = Depends(get_current_user)
):
    """Get spending summary for a period"""
    try:
        transaction_service = TransactionService()
        summary = await transaction_service.get_spending_summary(
            current_user, start_date, end_date
        )
        return summary
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting spending summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get spending summary"
        )


@router.get("/summary/categories", response_model=List[CategorySummary])
async def get_category_summary(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: str = Depends(get_current_user)
):
    """Get category breakdown for a period"""
    try:
        transaction_service = TransactionService()
        summary = await transaction_service.get_category_summary(
            current_user, start_date, end_date
        )
        return summary
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting category summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get category summary"
        )