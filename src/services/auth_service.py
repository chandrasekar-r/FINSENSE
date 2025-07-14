from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import uuid
from src.config.database import execute_query_one, execute_command
from src.utils.auth import verify_password, create_token_response, verify_token
from src.utils.logger import logger


class AuthService:
    """Service for authentication-related operations"""
    
    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return verify_password(password, hashed_password)
    
    def create_tokens(self, user_id: str, email: str) -> Dict[str, Any]:
        """Create access and refresh tokens"""
        return create_token_response(user_id, email)
    
    async def store_refresh_token(self, user_id: str, refresh_token: str) -> None:
        """Store refresh token in database"""
        try:
            # Calculate expiration (7 days from now)
            expires_at = datetime.utcnow() + timedelta(days=7)
            
            # Insert refresh token
            query = """
                INSERT INTO refresh_tokens (user_id, token, expires_at)
                VALUES ($1, $2, $3)
            """
            
            await execute_command(
                query,
                uuid.UUID(user_id),
                refresh_token,
                expires_at
            )
            
            # Clean up old tokens for this user
            await self._cleanup_expired_tokens(user_id)
            
        except Exception as e:
            logger.error(f"Error storing refresh token: {e}")
            raise e
    
    async def refresh_tokens(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        try:
            # Verify refresh token
            payload = verify_token(refresh_token, "refresh")
            user_id = payload.get("sub")
            email = payload.get("email")
            
            if not user_id or not email:
                raise ValueError("Invalid token payload")
            
            # Check if refresh token exists and is not revoked
            token_record = await self._get_refresh_token(refresh_token)
            if not token_record:
                raise ValueError("Refresh token not found or revoked")
            
            # Check if token is expired
            if datetime.utcnow() > token_record["expires_at"]:
                # Clean up expired token
                await self._revoke_refresh_token_by_token(refresh_token)
                raise ValueError("Refresh token expired")
            
            # Create new tokens
            new_tokens = create_token_response(user_id, email)
            
            # Store new refresh token
            await self.store_refresh_token(user_id, new_tokens["refresh_token"])
            
            # Revoke old refresh token
            await self._revoke_refresh_token_by_token(refresh_token)
            
            return new_tokens
        
        except Exception as e:
            logger.error(f"Error refreshing tokens: {e}")
            raise e
    
    async def revoke_refresh_token(self, refresh_token: str) -> None:
        """Revoke a refresh token (logout)"""
        try:
            await self._revoke_refresh_token_by_token(refresh_token)
        except Exception as e:
            logger.error(f"Error revoking refresh token: {e}")
            # Don't raise error for logout as it's not critical
    
    async def _get_refresh_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Get refresh token record from database"""
        try:
            query = """
                SELECT id, user_id, token, expires_at, created_at, revoked_at
                FROM refresh_tokens
                WHERE token = $1 AND revoked_at IS NULL
            """
            
            token_record = await execute_query_one(query, token)
            return dict(token_record) if token_record else None
        
        except Exception as e:
            logger.error(f"Error getting refresh token: {e}")
            return None
    
    async def _revoke_refresh_token_by_token(self, token: str) -> None:
        """Revoke refresh token by token value"""
        try:
            query = """
                UPDATE refresh_tokens
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE token = $1 AND revoked_at IS NULL
            """
            
            await execute_command(query, token)
        
        except Exception as e:
            logger.error(f"Error revoking refresh token: {e}")
            raise e
    
    async def _cleanup_expired_tokens(self, user_id: str) -> None:
        """Clean up expired and old refresh tokens for a user"""
        try:
            # Remove expired tokens
            query1 = """
                DELETE FROM refresh_tokens
                WHERE user_id = $1 AND expires_at < CURRENT_TIMESTAMP
            """
            
            await execute_command(query1, uuid.UUID(user_id))
            
            # Keep only the latest 5 valid tokens per user
            query2 = """
                DELETE FROM refresh_tokens
                WHERE user_id = $1 
                AND id NOT IN (
                    SELECT id FROM refresh_tokens
                    WHERE user_id = $1 AND revoked_at IS NULL
                    ORDER BY created_at DESC
                    LIMIT 5
                )
            """
            
            await execute_command(query2, uuid.UUID(user_id))
        
        except Exception as e:
            logger.error(f"Error cleaning up tokens: {e}")
            # Don't raise error as this is maintenance