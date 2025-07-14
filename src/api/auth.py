from fastapi import APIRouter, HTTPException, status, Depends
from src.models.user import UserCreate, UserLogin, UserResponse, TokenResponse, RefreshTokenRequest, LoginResponse
from src.services.user_service import UserService
from src.services.auth_service import AuthService
from src.utils.logger import logger

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate):
    """Register a new user"""
    try:
        user_service = UserService()
        
        # Check if user already exists
        existing_user = await user_service.get_user_by_email(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Create user
        user = await user_service.create_user(user_data)
        logger.info(f"User registered successfully: {user.email}")
        
        return user
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=LoginResponse)
async def login_user(login_data: UserLogin):
    """Authenticate user and return tokens"""
    try:
        auth_service = AuthService()
        user_service = UserService()
        
        # Get user by email
        user_data = await user_service.get_user_by_email(login_data.email)
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Verify password
        if not auth_service.verify_password(login_data.password, user_data["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Check if user is active
        if not user_data["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is disabled"
            )
        
        # Create tokens
        tokens = auth_service.create_tokens(str(user_data["id"]), user_data["email"])
        
        # Store refresh token
        await auth_service.store_refresh_token(str(user_data["id"]), tokens["refresh_token"])
        
        # Create user response (exclude password_hash)
        user_response = UserResponse(
            id=user_data["id"],
            email=user_data["email"],
            first_name=user_data["first_name"],
            last_name=user_data["last_name"],
            default_currency=user_data["default_currency"],
            is_active=user_data["is_active"],
            email_verified=user_data["email_verified"],
            created_at=user_data["created_at"],
            updated_at=user_data["updated_at"]
        )
        
        # Combine tokens and user data
        response = LoginResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            expires_in=tokens["expires_in"],
            user=user_response
        )
        
        logger.info(f"User logged in successfully: {user_data['email']}")
        return response
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(refresh_data: RefreshTokenRequest):
    """Refresh access token using refresh token"""
    try:
        auth_service = AuthService()
        
        # Verify refresh token and get new tokens
        tokens = await auth_service.refresh_tokens(refresh_data.refresh_token)
        
        logger.info("Access token refreshed successfully")
        return tokens
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout_user(refresh_data: RefreshTokenRequest):
    """Logout user by revoking refresh token"""
    try:
        auth_service = AuthService()
        
        # Revoke refresh token
        await auth_service.revoke_refresh_token(refresh_data.refresh_token)
        
        logger.info("User logged out successfully")
        return {"message": "Logged out successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )