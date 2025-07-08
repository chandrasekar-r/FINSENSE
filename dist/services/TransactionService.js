"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionService = void 0;
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
class TransactionService {
    async getTransactions(userId, page = 1, limit = 20, filters = {}) {
        try {
            const offset = (page - 1) * limit;
            let whereConditions = ['t.user_id = $1'];
            let queryParams = [userId];
            let paramIndex = 2;
            if (filters.category) {
                whereConditions.push(`c.name ILIKE $${paramIndex}`);
                queryParams.push(`%${filters.category}%`);
                paramIndex++;
            }
            if (filters.startDate) {
                whereConditions.push(`t.transaction_date >= $${paramIndex}`);
                queryParams.push(filters.startDate);
                paramIndex++;
            }
            if (filters.endDate) {
                whereConditions.push(`t.transaction_date <= $${paramIndex}`);
                queryParams.push(filters.endDate);
                paramIndex++;
            }
            if (filters.type) {
                whereConditions.push(`t.transaction_type = $${paramIndex}`);
                queryParams.push(filters.type);
                paramIndex++;
            }
            const whereClause = whereConditions.join(' AND ');
            const countQuery = `
        SELECT COUNT(*)
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE ${whereClause}
      `;
            const countResult = await database_1.pool.query(countQuery, queryParams.slice(0, paramIndex - 1));
            const total = parseInt(countResult.rows[0].count);
            const query = `
        SELECT 
          t.*,
          c.name as category_name,
          c.color as category_color,
          c.icon as category_icon
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE ${whereClause}
        ORDER BY t.transaction_date DESC, t.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
            queryParams.push(limit, offset);
            const result = await database_1.pool.query(query, queryParams);
            return {
                transactions: result.rows,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            };
        }
        catch (error) {
            throw (0, errorHandler_1.createError)('Failed to retrieve transactions', 500);
        }
    }
    async createTransaction(userId, data) {
        try {
            const query = `
        INSERT INTO transactions (
          user_id, category_id, amount, description, transaction_date,
          vendor_name, currency, transaction_type
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
            const vendorName = data.vendor_name || data.merchant_name || 'Unknown Vendor';
            const currency = data.currency || 'USD';
            const result = await database_1.pool.query(query, [
                userId,
                data.category_id,
                data.amount,
                data.description,
                data.transaction_date || new Date().toISOString().split('T')[0],
                vendorName,
                currency,
                data.transaction_type || 'expense'
            ]);
            return result.rows[0];
        }
        catch (error) {
            throw (0, errorHandler_1.createError)('Failed to create transaction', 500);
        }
    }
    async getTransactionById(transactionId, userId) {
        const client = await database_1.pool.connect();
        try {
            console.log('🔍 [Transaction] Fetching transaction details for:', { transactionId, userId });
            await client.query(`SET app.current_user_id = '${userId}'`);
            const query = `
        SELECT 
          t.*,
          c.name as category_name,
          c.color as category_color,
          c.icon as category_icon,
          rp.extracted_data as receipt_data,
          rp.id as receipt_id
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN receipt_processing rp ON rp.transaction_id = t.id
        WHERE t.id = $1 AND t.user_id = $2
      `;
            const result = await client.query(query, [transactionId, userId]);
            if (result.rows.length === 0) {
                throw (0, errorHandler_1.createError)('Transaction not found', 404);
            }
            const transaction = result.rows[0];
            console.log('🔍 [Transaction] Query result:', {
                transactionId: transaction.id,
                hasReceiptData: !!transaction.receipt_data,
                receiptId: transaction.receipt_id,
                receiptDataLength: transaction.receipt_data ? transaction.receipt_data.length : 0
            });
            if (transaction.receipt_data) {
                try {
                    if (typeof transaction.receipt_data === 'string') {
                        transaction.receipt_details = JSON.parse(transaction.receipt_data);
                    }
                    else {
                        transaction.receipt_details = transaction.receipt_data;
                    }
                    console.log('✅ [Transaction] Receipt data processed successfully');
                    console.log('🔍 [Transaction] Receipt data structure:', {
                        hasExtractedText: !!transaction.receipt_details.extractedText,
                        hasParsedData: !!transaction.receipt_details.parsedData,
                        itemsCount: transaction.receipt_details.parsedData?.items?.length || 0,
                        dataType: typeof transaction.receipt_data
                    });
                }
                catch (error) {
                    console.error('❌ [Transaction] Error processing receipt data:', error);
                    transaction.receipt_details = null;
                }
            }
            else {
                console.log('⚠️ [Transaction] No receipt data found for transaction');
            }
            return transaction;
        }
        catch (error) {
            console.error('❌ [Transaction] Failed to retrieve transaction:', error);
            throw (0, errorHandler_1.createError)('Failed to retrieve transaction', 500);
        }
        finally {
            client.release();
        }
    }
    async updateTransaction(transactionId, userId, data) {
        try {
            const setClauses = [];
            const queryParams = [];
            let paramIndex = 1;
            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined) {
                    setClauses.push(`${key} = $${paramIndex}`);
                    queryParams.push(value);
                    paramIndex++;
                }
            });
            if (setClauses.length === 0) {
                throw (0, errorHandler_1.createError)('No data provided for update', 400);
            }
            setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
            queryParams.push(transactionId, userId);
            const query = `
        UPDATE transactions
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;
            const result = await database_1.pool.query(query, queryParams);
            if (result.rows.length === 0) {
                throw (0, errorHandler_1.createError)('Transaction not found', 404);
            }
            return result.rows[0];
        }
        catch (error) {
            throw (0, errorHandler_1.createError)('Failed to update transaction', 500);
        }
    }
    async deleteTransaction(transactionId, userId) {
        const client = await database_1.pool.connect();
        try {
            await client.query(`SET app.current_user_id = '${userId}'`);
            const query = `
        DELETE FROM transactions
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;
            const result = await client.query(query, [transactionId, userId]);
            if (result.rows.length === 0) {
                throw (0, errorHandler_1.createError)('Transaction not found', 404);
            }
        }
        catch (error) {
            console.error('Error deleting transaction:', error);
            throw (0, errorHandler_1.createError)('Failed to delete transaction', 500);
        }
        finally {
            client.release();
        }
    }
    async getSpendingSummary(userId, period = 'month') {
        try {
            let dateCondition = '';
            switch (period) {
                case 'week':
                    dateCondition = `AND transaction_date >= date_trunc('week', CURRENT_DATE)`;
                    break;
                case 'month':
                    dateCondition = `AND transaction_date >= date_trunc('month', CURRENT_DATE)`;
                    break;
                case 'year':
                    dateCondition = `AND transaction_date >= date_trunc('year', CURRENT_DATE)`;
                    break;
                default:
                    dateCondition = `AND transaction_date >= date_trunc('month', CURRENT_DATE)`;
            }
            const query = `
        SELECT
          COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN transaction_type = 'income' THEN 1 END) as income_count,
          COUNT(CASE WHEN transaction_type = 'expense' THEN 1 END) as expense_count
        FROM transactions
        WHERE user_id = $1 ${dateCondition}
      `;
            const result = await database_1.pool.query(query, [userId]);
            const summary = result.rows[0];
            return {
                period,
                totalIncome: parseFloat(summary.total_income),
                totalExpenses: parseFloat(summary.total_expenses),
                netAmount: parseFloat(summary.total_income) - parseFloat(summary.total_expenses),
                totalTransactions: parseInt(summary.total_transactions),
                incomeCount: parseInt(summary.income_count),
                expenseCount: parseInt(summary.expense_count)
            };
        }
        catch (error) {
            throw (0, errorHandler_1.createError)('Failed to get spending summary', 500);
        }
    }
    async getCategorySummary(userId, period = 'month') {
        try {
            let dateCondition = '';
            switch (period) {
                case 'week':
                    dateCondition = `AND t.transaction_date >= date_trunc('week', CURRENT_DATE)`;
                    break;
                case 'month':
                    dateCondition = `AND t.transaction_date >= date_trunc('month', CURRENT_DATE)`;
                    break;
                case 'year':
                    dateCondition = `AND t.transaction_date >= date_trunc('year', CURRENT_DATE)`;
                    break;
                default:
                    dateCondition = `AND t.transaction_date >= date_trunc('month', CURRENT_DATE)`;
            }
            const query = `
        SELECT
          c.id,
          c.name,
          c.color,
          c.icon,
          COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END), 0) as total_spent,
          COALESCE(SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
          COUNT(t.id) as transaction_count
        FROM categories c
        LEFT JOIN transactions t ON c.id = t.category_id ${dateCondition}
        WHERE c.user_id = $1
        GROUP BY c.id, c.name, c.color, c.icon
        ORDER BY total_spent DESC
      `;
            const result = await database_1.pool.query(query, [userId]);
            return {
                period,
                categories: result.rows.map((row) => ({
                    id: row.id,
                    name: row.name,
                    color: row.color,
                    icon: row.icon,
                    totalSpent: parseFloat(row.total_spent),
                    totalIncome: parseFloat(row.total_income),
                    transactionCount: parseInt(row.transaction_count),
                    percentage: 0
                }))
            };
        }
        catch (error) {
            throw (0, errorHandler_1.createError)('Failed to get category summary', 500);
        }
    }
    async getCategoryIdByName(userId, categoryName) {
        try {
            const query = `
        SELECT id FROM categories
        WHERE user_id = $1 AND LOWER(name) = LOWER($2)
        LIMIT 1
      `;
            const result = await database_1.pool.query(query, [userId, categoryName]);
            return result.rows[0]?.id || null;
        }
        catch (error) {
            return null;
        }
    }
}
exports.TransactionService = TransactionService;
//# sourceMappingURL=TransactionService.js.map