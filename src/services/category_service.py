from typing import List, Dict, Any, Optional
import uuid
from src.config.database import DatabaseManager
from src.models.category import CategoryCreate, CategoryUpdate
from src.middleware.error_handler import create_error
from src.utils.logger import logger


class CategoryService:
    """Service for category-related operations"""
    
    async def get_user_categories(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all categories for a user"""
        try:
            query = """
                SELECT id, user_id, name, color, icon, is_default, created_at, updated_at
                FROM categories
                WHERE user_id = $1
                ORDER BY is_default DESC, name ASC
            """
            
            async with DatabaseManager(user_id) as db:
                rows = await db.fetch(query, uuid.UUID(user_id))
                categories = [dict(row) for row in rows]
                
                logger.info(f"Retrieved {len(categories)} categories for user {user_id}")
                return categories
        
        except Exception as e:
            logger.error(f"Error getting categories: {e}")
            raise create_error("Failed to retrieve categories", 500)
    
    async def create_category(self, user_id: str, category_data: CategoryCreate) -> Dict[str, Any]:
        """Create a new category"""
        try:
            async with DatabaseManager(user_id) as db:
                # Check if category with same name already exists
                existing_query = """
                    SELECT id FROM categories
                    WHERE user_id = $1 AND LOWER(name) = LOWER($2)
                """
                existing = await db.fetchrow(
                    existing_query, 
                    uuid.UUID(user_id), 
                    category_data.name
                )
                
                if existing:
                    raise create_error("Category with this name already exists", 400)
                
                # Create new category
                create_query = """
                    INSERT INTO categories (user_id, name, color, icon, is_default)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id, user_id, name, color, icon, is_default, created_at, updated_at
                """
                
                category = await db.fetchrow(
                    create_query,
                    uuid.UUID(user_id),
                    category_data.name,
                    category_data.color,
                    category_data.icon,
                    False
                )
                
                logger.info(f"Category created successfully: {category['id']}")
                return dict(category)
        
        except Exception as e:
            logger.error(f"Error creating category: {e}")
            if "already exists" in str(e):
                raise e
            raise create_error("Failed to create category", 500)
    
    async def update_category(
        self, 
        category_id: str, 
        user_id: str, 
        category_data: CategoryUpdate
    ) -> Optional[Dict[str, Any]]:
        """Update a category"""
        try:
            async with DatabaseManager(user_id) as db:
                # Check if category exists and belongs to user
                check_query = """
                    SELECT id FROM categories
                    WHERE id = $1 AND user_id = $2
                """
                existing = await db.fetchrow(
                    check_query, 
                    uuid.UUID(category_id), 
                    uuid.UUID(user_id)
                )
                
                if not existing:
                    raise create_error("Category not found", 404)
                
                # If updating name, check for duplicates
                if category_data.name:
                    duplicate_query = """
                        SELECT id FROM categories
                        WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id != $3
                    """
                    duplicate = await db.fetchrow(
                        duplicate_query,
                        uuid.UUID(user_id),
                        category_data.name,
                        uuid.UUID(category_id)
                    )
                    
                    if duplicate:
                        raise create_error("Category with this name already exists", 400)
                
                # Build dynamic update query
                update_fields = []
                params = []
                param_count = 1
                
                update_data = category_data.dict(exclude_unset=True)
                
                for field, value in update_data.items():
                    if value is not None:
                        update_fields.append(f"{field} = ${param_count}")
                        params.append(value)
                        param_count += 1
                
                if not update_fields:
                    raise create_error("No fields to update", 400)
                
                update_fields.append("updated_at = CURRENT_TIMESTAMP")
                
                # Add where clause parameters
                params.extend([uuid.UUID(category_id), uuid.UUID(user_id)])
                
                query = f"""
                    UPDATE categories
                    SET {', '.join(update_fields)}
                    WHERE id = ${param_count} AND user_id = ${param_count + 1}
                    RETURNING id, user_id, name, color, icon, is_default, created_at, updated_at
                """
                
                category = await db.fetchrow(query, *params)
                
                if not category:
                    raise create_error("Category not found", 404)
                
                logger.info(f"Category updated successfully: {category_id}")
                return dict(category)
        
        except Exception as e:
            logger.error(f"Error updating category: {e}")
            if "not found" in str(e) or "already exists" in str(e):
                raise e
            raise create_error("Failed to update category", 500)
    
    async def delete_category(self, category_id: str, user_id: str) -> bool:
        """Delete a category"""
        try:
            async with DatabaseManager(user_id) as db:
                async with db.transaction():
                    # Check if category exists and belongs to user
                    check_query = """
                        SELECT id, is_default FROM categories
                        WHERE id = $1 AND user_id = $2
                    """
                    category = await db.fetchrow(
                        check_query, 
                        uuid.UUID(category_id), 
                        uuid.UUID(user_id)
                    )
                    
                    if not category:
                        raise create_error("Category not found", 404)
                    
                    if category["is_default"]:
                        raise create_error("Cannot delete default categories", 400)
                    
                    # Check if category is being used by transactions
                    transaction_query = """
                        SELECT COUNT(*) as count FROM transactions
                        WHERE category_id = $1 AND user_id = $2
                    """
                    transaction_result = await db.fetchrow(
                        transaction_query, 
                        uuid.UUID(category_id), 
                        uuid.UUID(user_id)
                    )
                    
                    if transaction_result["count"] > 0:
                        raise create_error(
                            "Cannot delete category that is being used by transactions", 
                            400
                        )
                    
                    # Delete the category
                    delete_query = """
                        DELETE FROM categories
                        WHERE id = $1 AND user_id = $2
                    """
                    result = await db.execute(
                        delete_query, 
                        uuid.UUID(category_id), 
                        uuid.UUID(user_id)
                    )
                    
                    success = result.split()[-1] == "1"
                    
                    if success:
                        logger.info(f"Category deleted successfully: {category_id}")
                    
                    return success
        
        except Exception as e:
            logger.error(f"Error deleting category: {e}")
            if "not found" in str(e) or "Cannot delete" in str(e):
                raise e
            raise create_error("Failed to delete category", 500)