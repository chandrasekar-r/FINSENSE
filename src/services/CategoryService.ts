import { pool } from '../config/database';
import { createError } from '../middleware/errorHandler';

interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateCategoryData {
  name: string;
  color: string;
  icon: string;
}

export class CategoryService {
  async getUserCategories(userId: string): Promise<Category[]> {
    const client = await pool.connect();
    try {
      // Set user context for Row Level Security
      await client.query(`SET app.current_user_id = '${userId}'`);
      
      const query = `
        SELECT id, user_id, name, color, icon, is_default, created_at, updated_at
        FROM categories
        WHERE user_id = $1
        ORDER BY is_default DESC, name ASC
      `;
      
      const result = await client.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error retrieving categories:', error);
      throw createError('Failed to retrieve categories', 500);
    } finally {
      client.release();
    }
  }

  async createCategory(userId: string, data: CreateCategoryData): Promise<Category> {
    const client = await pool.connect();
    try {
      // Set user context for Row Level Security
      await client.query(`SET app.current_user_id = '${userId}'`);
      
      // Check if category with same name already exists
      const existingQuery = `
        SELECT id FROM categories
        WHERE user_id = $1 AND LOWER(name) = LOWER($2)
      `;
      const existingResult = await client.query(existingQuery, [userId, data.name]);
      
      if (existingResult.rows.length > 0) {
        throw createError('Category with this name already exists', 400);
      }

      const query = `
        INSERT INTO categories (user_id, name, color, icon, is_default)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const result = await client.query(query, [
        userId,
        data.name,
        data.color,
        data.icon,
        false
      ]);
      
      return result.rows[0];
    } catch (error: any) {
      console.error('Error creating category:', error);
      if (error.message && error.message.includes('already exists')) {
        throw error;
      }
      throw createError('Failed to create category', 500);
    } finally {
      client.release();
    }
  }

  async updateCategory(categoryId: string, userId: string, updateData: Partial<CreateCategoryData>): Promise<Category> {
    const client = await pool.connect();
    try {
      // Set user context for Row Level Security
      await client.query(`SET app.current_user_id = '${userId}'`);
      
      // Check if category exists and belongs to user
      const checkQuery = `
        SELECT id FROM categories
        WHERE id = $1 AND user_id = $2
      `;
      const checkResult = await client.query(checkQuery, [categoryId, userId]);
      
      if (checkResult.rows.length === 0) {
        throw createError('Category not found', 404);
      }

      // If updating name, check for duplicates
      if (updateData.name) {
        const duplicateQuery = `
          SELECT id FROM categories
          WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id != $3
        `;
        const duplicateResult = await client.query(duplicateQuery, [userId, updateData.name, categoryId]);
        
        if (duplicateResult.rows.length > 0) {
          throw createError('Category with this name already exists', 400);
        }
      }

      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (updateData.name) {
        updateFields.push(`name = $${paramCount++}`);
        updateValues.push(updateData.name);
      }
      if (updateData.color) {
        updateFields.push(`color = $${paramCount++}`);
        updateValues.push(updateData.color);
      }
      if (updateData.icon) {
        updateFields.push(`icon = $${paramCount++}`);
        updateValues.push(updateData.icon);
      }

      if (updateFields.length === 0) {
        throw createError('No fields to update', 400);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(categoryId, userId);

      const query = `
        UPDATE categories
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount++} AND user_id = $${paramCount++}
        RETURNING *
      `;
      
      const result = await client.query(query, updateValues);
      return result.rows[0];
    } catch (error: any) {
      console.error('Error updating category:', error);
      if (error.message && (error.message.includes('not found') || error.message.includes('already exists'))) {
        throw error;
      }
      throw createError('Failed to update category', 500);
    } finally {
      client.release();
    }
  }

  async deleteCategory(categoryId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Set user context for Row Level Security
      await client.query(`SET app.current_user_id = '${userId}'`);
      
      // Check if category exists and belongs to user
      const checkQuery = `
        SELECT id, is_default FROM categories
        WHERE id = $1 AND user_id = $2
      `;
      const checkResult = await client.query(checkQuery, [categoryId, userId]);
      
      if (checkResult.rows.length === 0) {
        throw createError('Category not found', 404);
      }

      const category = checkResult.rows[0];
      if (category.is_default) {
        throw createError('Cannot delete default categories', 400);
      }

      // Check if category is being used by transactions
      const transactionQuery = `
        SELECT COUNT(*) as count FROM transactions
        WHERE category_id = $1 AND user_id = $2
      `;
      const transactionResult = await client.query(transactionQuery, [categoryId, userId]);
      const transactionCount = parseInt(transactionResult.rows[0].count);

      if (transactionCount > 0) {
        throw createError('Cannot delete category that is being used by transactions', 400);
      }

      // Delete the category
      const deleteQuery = `
        DELETE FROM categories
        WHERE id = $1 AND user_id = $2
      `;
      await client.query(deleteQuery, [categoryId, userId]);

      await client.query('COMMIT');
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error deleting category:', error);
      if (error.message && (error.message.includes('not found') || error.message.includes('Cannot delete'))) {
        throw error;
      }
      throw createError('Failed to delete category', 500);
    } finally {
      client.release();
    }
  }
}