"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
class ChatService {
    async saveChatInteraction(userId, userMessage, aiResponse) {
        const client = await database_1.pool.connect();
        try {
            await client.query(`SET app.current_user_id = '${userId}'`);
            const query = `
        INSERT INTO chat_history (user_id, message, response)
        VALUES ($1, $2, $3)
      `;
            await client.query(query, [userId, userMessage, aiResponse]);
        }
        catch (error) {
            console.error('Database error saving chat interaction:', error);
            throw (0, errorHandler_1.createError)('Failed to save chat interaction', 500);
        }
        finally {
            client.release();
        }
    }
    async getChatHistory(userId, page = 1, limit = 20) {
        const client = await database_1.pool.connect();
        try {
            await client.query(`SET app.current_user_id = '${userId}'`);
            const offset = (page - 1) * limit;
            const countQuery = 'SELECT COUNT(*) FROM chat_history WHERE user_id = $1';
            const countResult = await client.query(countQuery, [userId]);
            const total = parseInt(countResult.rows[0].count);
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
        }
        catch (error) {
            console.error('Error retrieving chat history:', error);
            throw (0, errorHandler_1.createError)('Failed to retrieve chat history', 500);
        }
        finally {
            client.release();
        }
    }
    async clearChatHistory(userId) {
        const client = await database_1.pool.connect();
        try {
            await client.query(`SET app.current_user_id = '${userId}'`);
            const query = 'DELETE FROM chat_history WHERE user_id = $1';
            await client.query(query, [userId]);
        }
        catch (error) {
            console.error('Error clearing chat history:', error);
            throw (0, errorHandler_1.createError)('Failed to clear chat history', 500);
        }
        finally {
            client.release();
        }
    }
    async getUserFinancialContext(userId) {
        try {
            const spendingQuery = `
        SELECT COALESCE(SUM(amount), 0) as total_spending, COUNT(*) as transaction_count
        FROM transactions
        WHERE user_id = $1 
          AND date_trunc('month', transaction_date) = date_trunc('month', CURRENT_DATE)
      `;
            const spendingResult = await database_1.pool.query(spendingQuery, [userId]);
            const totalSpending = parseFloat(spendingResult.rows[0].total_spending);
            const transactionsQuery = `
        SELECT t.*, c.name as category_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1
        ORDER BY t.transaction_date DESC
        LIMIT 10
      `;
            const transactionsResult = await database_1.pool.query(transactionsQuery, [userId]);
            const budgetsQuery = `
        SELECT b.*, c.name as category_name
        FROM budgets b
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.user_id = $1 AND b.is_active = true
      `;
            const budgetsResult = await database_1.pool.query(budgetsQuery, [userId]);
            const categoriesQuery = `
        SELECT id, name, color, icon
        FROM categories
        WHERE user_id = $1
        ORDER BY name
      `;
            const categoriesResult = await database_1.pool.query(categoriesQuery, [userId]);
            return {
                totalSpending,
                recentTransactions: transactionsResult.rows,
                budgets: budgetsResult.rows,
                categories: categoriesResult.rows
            };
        }
        catch (error) {
            throw (0, errorHandler_1.createError)('Failed to get user financial context', 500);
        }
    }
}
exports.ChatService = ChatService;
//# sourceMappingURL=ChatService.js.map