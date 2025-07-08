import { pool } from '../config/database';
import { createError } from '../middleware/errorHandler';

interface ChatMessage {
  id: string;
  user_message: string;
  ai_response: string;
  created_at: string;
}

interface FinancialContext {
  totalSpending: number;
  recentTransactions: Array<any>;
  budgets: Array<any>;
  categories: Array<any>;
}

export class ChatService {
  async saveChatInteraction(userId: string, userMessage: string, aiResponse: string): Promise<void> {
    const client = await pool.connect();
    try {
      // Set user context for Row Level Security
      await client.query(`SET app.current_user_id = '${userId}'`);
      
      const query = `
        INSERT INTO chat_history (user_id, message, response)
        VALUES ($1, $2, $3)
      `;
      
      await client.query(query, [userId, userMessage, aiResponse]);
    } catch (error) {
      console.error('Database error saving chat interaction:', error);
      throw createError('Failed to save chat interaction', 500);
    } finally {
      client.release();
    }
  }

  async getChatHistory(userId: string, page: number = 1, limit: number = 20): Promise<{
    messages: ChatMessage[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const client = await pool.connect();
    try {
      // Set user context for Row Level Security
      await client.query(`SET app.current_user_id = '${userId}'`);
      
      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = 'SELECT COUNT(*) FROM chat_history WHERE user_id = $1';
      const countResult = await client.query(countQuery, [userId]);
      const total = parseInt(countResult.rows[0].count);

      // Get messages
      const query = `
        SELECT id, message as user_message, response as ai_response, created_at
        FROM chat_history
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await client.query(query, [userId, limit, offset]);
      
      return {
        messages: result.rows,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error retrieving chat history:', error);
      throw createError('Failed to retrieve chat history', 500);
    } finally {
      client.release();
    }
  }

  async clearChatHistory(userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      // Set user context for Row Level Security
      await client.query(`SET app.current_user_id = '${userId}'`);
      
      const query = 'DELETE FROM chat_history WHERE user_id = $1';
      await client.query(query, [userId]);
    } catch (error) {
      console.error('Error clearing chat history:', error);
      throw createError('Failed to clear chat history', 500);
    } finally {
      client.release();
    }
  }

  async getUserFinancialContext(userId: string): Promise<FinancialContext> {
    try {
      // Get total spending this month (all amounts are positive in our schema)
      const spendingQuery = `
        SELECT COALESCE(SUM(amount), 0) as total_spending, COUNT(*) as transaction_count
        FROM transactions
        WHERE user_id = $1 
          AND date_trunc('month', transaction_date) = date_trunc('month', CURRENT_DATE)
      `;
      const spendingResult = await pool.query(spendingQuery, [userId]);
      const totalSpending = parseFloat(spendingResult.rows[0].total_spending);

      // Get recent transactions (last 10)
      const transactionsQuery = `
        SELECT t.*, c.name as category_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1
        ORDER BY t.transaction_date DESC
        LIMIT 10
      `;
      const transactionsResult = await pool.query(transactionsQuery, [userId]);

      // Get active budgets
      const budgetsQuery = `
        SELECT b.*, c.name as category_name
        FROM budgets b
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.user_id = $1 AND b.is_active = true
      `;
      const budgetsResult = await pool.query(budgetsQuery, [userId]);

      // Get user categories
      const categoriesQuery = `
        SELECT id, name, color, icon
        FROM categories
        WHERE user_id = $1
        ORDER BY name
      `;
      const categoriesResult = await pool.query(categoriesQuery, [userId]);

      return {
        totalSpending,
        recentTransactions: transactionsResult.rows,
        budgets: budgetsResult.rows,
        categories: categoriesResult.rows
      };
    } catch (error) {
      throw createError('Failed to get user financial context', 500);
    }
  }
}