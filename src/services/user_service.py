from typing import Optional, Dict, Any
import uuid
from src.config.database import DatabaseManager, execute_query_one, execute_command
from src.models.user import UserCreate, UserUpdate
from src.utils.auth import hash_password
from src.utils.logger import logger


class UserService:
    """Service for user-related operations"""
    
    async def create_user(self, user_data: UserCreate) -> Dict[str, Any]:
        """Create a new user"""
        try:
            # Hash password
            hashed_password = hash_password(user_data.password)
            
            # Insert user
            query = """
                INSERT INTO users (email, password_hash, first_name, last_name, default_currency)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, email, first_name, last_name, default_currency, 
                         is_active, email_verified, created_at, updated_at
            """
            
            user = await execute_query_one(
                query,
                user_data.email,
                hashed_password,
                user_data.first_name,
                user_data.last_name,
                user_data.default_currency
            )
            
            if user:
                # Create default categories for the user
                await self._create_default_categories(str(user["id"]))
                logger.info(f"User created successfully: {user['email']}")
            
            return dict(user)
        
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            raise e
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        try:
            query = """
                SELECT id, email, password_hash, first_name, last_name, 
                       default_currency, is_active, email_verified, created_at, updated_at
                FROM users 
                WHERE email = $1
            """
            
            user = await execute_query_one(query, email)
            return dict(user) if user else None
        
        except Exception as e:
            logger.error(f"Error getting user by email: {e}")
            raise e
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            async with DatabaseManager(user_id) as db:
                query = """
                    SELECT id, email, first_name, last_name, default_currency, 
                           is_active, email_verified, created_at, updated_at
                    FROM users 
                    WHERE id = $1
                """
                
                user = await db.fetchrow(query, uuid.UUID(user_id))
                return dict(user) if user else None
        
        except Exception as e:
            logger.error(f"Error getting user by ID: {e}")
            raise e
    
    async def update_user(self, user_id: str, user_data: UserUpdate) -> Optional[Dict[str, Any]]:
        """Update user information"""
        try:
            # Build dynamic update query
            update_fields = []
            values = []
            param_count = 1
            
            if user_data.first_name is not None:
                update_fields.append(f"first_name = ${param_count}")
                values.append(user_data.first_name)
                param_count += 1
            
            if user_data.last_name is not None:
                update_fields.append(f"last_name = ${param_count}")
                values.append(user_data.last_name)
                param_count += 1
            
            if user_data.default_currency is not None:
                update_fields.append(f"default_currency = ${param_count}")
                values.append(user_data.default_currency)
                param_count += 1
            
            if not update_fields:
                # No fields to update
                return await self.get_user_by_id(user_id)
            
            # Add user_id to values
            values.append(uuid.UUID(user_id))
            
            query = f"""
                UPDATE users 
                SET {', '.join(update_fields)}
                WHERE id = ${param_count}
                RETURNING id, email, first_name, last_name, default_currency, 
                         is_active, email_verified, created_at, updated_at
            """
            
            async with DatabaseManager(user_id) as db:
                user = await db.fetchrow(query, *values)
                return dict(user) if user else None
        
        except Exception as e:
            logger.error(f"Error updating user: {e}")
            raise e
    
    async def change_password(self, user_id: str, current_password: str, new_password: str) -> bool:
        """Change user password"""
        try:
            # Get current user
            user = await self.get_user_by_email_with_password(user_id)
            if not user:
                return False
            
            # Verify current password
            from src.utils.auth import verify_password
            if not verify_password(current_password, user["password_hash"]):
                return False
            
            # Hash new password
            hashed_password = hash_password(new_password)
            
            # Update password
            query = "UPDATE users SET password_hash = $1 WHERE id = $2"
            
            async with DatabaseManager(user_id) as db:
                await db.execute(query, hashed_password, uuid.UUID(user_id))
            
            logger.info(f"Password changed for user: {user_id}")
            return True
        
        except Exception as e:
            logger.error(f"Error changing password: {e}")
            raise e
    
    async def get_user_by_email_with_password(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user with password hash (for password verification)"""
        try:
            query = """
                SELECT id, email, password_hash, first_name, last_name, 
                       default_currency, is_active, email_verified, created_at, updated_at
                FROM users 
                WHERE id = $1
            """
            
            async with DatabaseManager(user_id) as db:
                user = await db.fetchrow(query, uuid.UUID(user_id))
                return dict(user) if user else None
        
        except Exception as e:
            logger.error(f"Error getting user with password: {e}")
            raise e
    
    async def delete_user(self, user_id: str) -> bool:
        """Delete user and all associated data"""
        try:
            # This should delete the user and cascade to related tables
            query = "DELETE FROM users WHERE id = $1"
            
            async with DatabaseManager(user_id) as db:
                result = await db.execute(query, uuid.UUID(user_id))
                deleted = result.split()[1] == "1"  # Check if one row was deleted
            
            if deleted:
                logger.info(f"User deleted successfully: {user_id}")
            
            return deleted
        
        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            raise e
    
    async def _create_default_categories(self, user_id: str):
        """Create default categories for a new user"""
        default_categories = [
            {"name": "Groceries", "color": "#10B981", "icon": "shopping-cart"},
            {"name": "Dining Out", "color": "#F59E0B", "icon": "utensils"},
            {"name": "Transportation", "color": "#3B82F6", "icon": "car"},
            {"name": "Entertainment", "color": "#8B5CF6", "icon": "film"},
            {"name": "Shopping", "color": "#EC4899", "icon": "shopping-bag"},
            {"name": "Healthcare", "color": "#EF4444", "icon": "heart"},
            {"name": "Utilities", "color": "#6B7280", "icon": "home"},
            {"name": "Other", "color": "#6B7280", "icon": "more-horizontal"}
        ]
        
        try:
            for category in default_categories:
                query = """
                    INSERT INTO categories (user_id, name, color, icon, is_default)
                    VALUES ($1, $2, $3, $4, true)
                """
                await execute_command(
                    query,
                    uuid.UUID(user_id),
                    category["name"],
                    category["color"],
                    category["icon"]
                )
            
            logger.info(f"Default categories created for user: {user_id}")
        
        except Exception as e:
            logger.error(f"Error creating default categories: {e}")
            # Don't raise error as this is not critical for user creation