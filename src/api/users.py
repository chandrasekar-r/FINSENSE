from fastapi import APIRouter, Depends, HTTPException, status
from src.models.user import UserResponse, UserUpdate, ChangePasswordRequest
from src.services.user_service import UserService
from src.middleware.auth_middleware import get_current_user
from src.utils.logger import logger

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: str = Depends(get_current_user)):
    """Get current user profile"""
    try:
        user_service = UserService()
        user = await user_service.get_user_by_id(current_user)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return user
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user profile"
        )


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_data: UserUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update current user profile"""
    try:
        user_service = UserService()
        user = await user_service.update_user(current_user, user_data)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return user
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user profile"
        )


@router.get("/profile")
async def get_user_profile(current_user: str = Depends(get_current_user)):
    """Get user profile (alias for /me)"""
    try:
        user_service = UserService()
        user = await user_service.get_user_by_id(current_user)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {
            "success": True,
            "data": user
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user profile"
        )


@router.put("/profile")
async def update_user_profile(
    user_data: UserUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update user profile"""
    try:
        user_service = UserService()
        user = await user_service.update_user(current_user, user_data)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {
            "success": True,
            "data": user,
            "message": "Profile updated successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user profile"
        )


@router.get("/settings")
async def get_user_settings(current_user: str = Depends(get_current_user)):
    """Get user settings (same as profile for now)"""
    try:
        user_service = UserService()
        user = await user_service.get_user_by_id(current_user)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # For now, settings are the same as profile
        # In the future, this could include additional settings
        return {
            "success": True,
            "data": user
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user settings"
        )


@router.put("/settings")
async def update_user_settings(
    settings_data: dict,
    current_user: str = Depends(get_current_user)
):
    """Update user settings"""
    try:
        user_service = UserService()
        
        # Extract user-updatable fields from settings
        user_update_data = UserUpdate()
        if 'default_currency' in settings_data:
            user_update_data.default_currency = settings_data['default_currency']
        if 'first_name' in settings_data:
            user_update_data.first_name = settings_data['first_name']
        if 'last_name' in settings_data:
            user_update_data.last_name = settings_data['last_name']
        
        user = await user_service.update_user(current_user, user_update_data)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {
            "success": True,
            "data": user,
            "message": "Settings updated successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user settings"
        )


@router.delete("/profile")
async def delete_user_account(current_user: str = Depends(get_current_user)):
    """Delete user account"""
    try:
        user_service = UserService()
        success = await user_service.delete_user(current_user)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {
            "success": True,
            "message": "Account deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user account: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account"
        )


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: str = Depends(get_current_user)
):
    """Change user password"""
    try:
        user_service = UserService()
        success = await user_service.change_password(
            current_user,
            password_data.current_password,
            password_data.new_password
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        return {"message": "Password changed successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )