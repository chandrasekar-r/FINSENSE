from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from src.models.category import CategoryCreate, CategoryUpdate, CategoryResponse
from src.services.category_service import CategoryService
from src.middleware.auth_middleware import get_current_user
from src.utils.logger import logger

router = APIRouter()


@router.get("/", response_model=List[CategoryResponse])
async def get_categories(current_user: str = Depends(get_current_user)):
    """Get user categories"""
    try:
        category_service = CategoryService()
        categories = await category_service.get_user_categories(current_user)
        return categories
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting categories: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get categories"
        )


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    current_user: str = Depends(get_current_user)
):
    """Create a new category"""
    try:
        category_service = CategoryService()
        category = await category_service.create_category(current_user, category_data)
        return category
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating category: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create category"
        )


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category_data: CategoryUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update a category"""
    try:
        category_service = CategoryService()
        category = await category_service.update_category(category_id, current_user, category_data)
        
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        return category
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating category: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update category"
        )


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    current_user: str = Depends(get_current_user)
):
    """Delete a category"""
    try:
        category_service = CategoryService()
        success = await category_service.delete_category(category_id, current_user)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting category: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete category"
        )