from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from src.utils.auth import verify_token, get_user_id_from_token
from src.utils.logger import logger

# Security scheme
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Get current user from JWT token
    Returns user_id as string
    """
    try:
        token = credentials.credentials
        payload = verify_token(token, "access")
        user_id = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user_id
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[str]:
    """
    Get current user from JWT token (optional)
    Returns user_id as string or None if no token provided
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


class AuthRequired:
    """
    Dependency class for routes that require authentication
    """
    def __init__(self, required: bool = True):
        self.required = required
    
    async def __call__(self, current_user: str = Depends(get_current_user)) -> str:
        return current_user


class OptionalAuth:
    """
    Dependency class for routes with optional authentication
    """
    async def __call__(
        self, 
        current_user: Optional[str] = Depends(get_optional_current_user)
    ) -> Optional[str]:
        return current_user


# Common dependency instances
auth_required = AuthRequired()
optional_auth = OptionalAuth()