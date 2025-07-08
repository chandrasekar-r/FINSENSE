"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetService = void 0;
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
class BudgetService {
    async getBudgets(userId, includeStatus = true) {
        try {
            const query = `
        SELECT 
          b.*,
          c.name as category_name,
          c.color as category_color,
          c.icon as category_icon
        FROM budgets b
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.user_id = $1
        ORDER BY b.created_at DESC
      `;
            const result = await database_1.pool.query(query, [userId]);
            const budgets = result.rows;
            if (includeStatus) {
                for (const budget of budgets) {
                    const status = await this.calculateBudgetStatus(budget);
                    Object.assign(budget, status);
                }
            }
            return budgets;
        }
        catch (error) {
            throw (0, errorHandler_1.createError)('Failed to retrieve budgets', 500);
        }
    }
    async createBudget(userId, data) {
        try {
            const query = `
        INSERT INTO budgets (
          user_id, category_id, name, amount, currency, period_type,
          start_date, end_date, alert_threshold, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
            console.log('Creating budget with data:', {
                userId,
                category_id: data.category_id,
                name: data.name,
                amount: data.amount,
                currency: data.currency,
                period_type: data.period_type,
                start_date: data.start_date,
                end_date: data.end_date || this.calculateEndDate(data.start_date, data.period_type),
                alert_threshold: data.alert_threshold || 80,
                is_active: true
            });
            const result = await database_1.pool.query(query, [
                userId,
                data.category_id,
                data.name,
                data.amount,
                data.currency,
                data.period_type,
                data.start_date,
                data.end_date || this.calculateEndDate(data.start_date, data.period_type),
                data.alert_threshold || 80,
                true
            ]);
            console.log('Budget created successfully:', result.rows[0]);
            return result.rows[0];
        }
        catch (error) {
            console.error('Budget creation error:', error);
            throw (0, errorHandler_1.createError)('Failed to create budget', 500);
        }
    }
    async getBudgetById(budgetId, userId) {
        try {
            const query = `
        SELECT 
          b.*,
          c.name as category_name,
          c.color as category_color,
          c.icon as category_icon
        FROM budgets b
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.id = $1 AND b.user_id = $2
      `;
            const result = await database_1.pool.query(query, [budgetId, userId]);
            if (result.rows.length === 0) {
                return null;
            }
            const budget = result.rows[0];
            const status = await this.calculateBudgetStatus(budget);
            return { ...budget, ...status };
        }
        catch (error) {
            throw (0, errorHandler_1.createError)('Failed to retrieve budget', 500);
        }
    }
    async updateBudget(budgetId, userId, data) {
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
            queryParams.push(budgetId, userId);
            const query = `
        UPDATE budgets
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;
            console.log('Budget update query:', query);
            console.log('Budget update params:', queryParams);
            const result = await database_1.pool.query(query, queryParams);
            if (result.rows.length === 0) {
                throw (0, errorHandler_1.createError)('Budget not found', 404);
            }
            return result.rows[0];
        }
        catch (error) {
            console.error('Budget update error details:', error);
            if (error instanceof Error && error.message.includes('Budget not found')) {
                throw error;
            }
            throw (0, errorHandler_1.createError)('Failed to update budget', 500);
        }
    }
    async deleteBudget(budgetId, userId) {
        try {
            const query = `
        DELETE FROM budgets
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;
            const result = await database_1.pool.query(query, [budgetId, userId]);
            if (result.rows.length === 0) {
                throw (0, errorHandler_1.createError)('Budget not found', 404);
            }
        }
        catch (error) {
            throw (0, errorHandler_1.createError)('Failed to delete budget', 500);
        }
    }
    async getBudgetStatus(budgetId, userId) {
        try {
            const budget = await this.getBudgetById(budgetId, userId);
            return budget ? await this.calculateBudgetStatus(budget) : null;
        }
        catch (error) {
            throw (0, errorHandler_1.createError)('Failed to get budget status', 500);
        }
    }
    async calculateBudgetStatus(budget) {
        try {
            const spentQuery = `
        SELECT COALESCE(SUM(amount), 0) as spent_amount
        FROM transactions
        WHERE user_id = $1 
          AND category_id = $2
          AND transaction_date >= $3
          AND transaction_date <= $4
          AND transaction_type = 'expense'
      `;
            const spentResult = await database_1.pool.query(spentQuery, [
                budget.user_id,
                budget.category_id,
                budget.start_date,
                budget.end_date
            ]);
            const spentAmount = parseFloat(spentResult.rows[0].spent_amount);
            const budgetAmount = parseFloat(budget.amount);
            const remainingAmount = budgetAmount - spentAmount;
            const percentageUsed = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
            const endDate = new Date(budget.end_date);
            const today = new Date();
            const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
            let status = 'on_track';
            let alertTriggered = false;
            if (percentageUsed >= 100) {
                status = 'over_budget';
                alertTriggered = true;
            }
            else if (percentageUsed >= (budget.alert_threshold || 80)) {
                status = 'warning';
                alertTriggered = true;
            }
            return {
                id: budget.id,
                name: budget.name,
                budgetAmount,
                spentAmount,
                remainingAmount,
                percentageUsed: Math.round(percentageUsed * 100) / 100,
                daysRemaining,
                alertTriggered,
                status,
                categoryName: budget.category_name,
                periodType: budget.period_type
            };
        }
        catch (error) {
            throw (0, errorHandler_1.createError)('Failed to calculate budget status', 500);
        }
    }
    calculateEndDate(startDate, periodType) {
        const start = new Date(startDate);
        let endDate = new Date(start);
        switch (periodType) {
            case 'weekly':
                endDate.setDate(start.getDate() + 7);
                break;
            case 'monthly':
                endDate.setMonth(start.getMonth() + 1);
                break;
            case 'yearly':
                endDate.setFullYear(start.getFullYear() + 1);
                break;
            default:
                endDate.setMonth(start.getMonth() + 1);
        }
        return endDate.toISOString().split('T')[0];
    }
    async checkAllBudgetsForAlerts(userId) {
        try {
            const budgets = await this.getBudgets(userId, true);
            return budgets.filter((budget) => budget.alertTriggered);
        }
        catch (error) {
            throw (0, errorHandler_1.createError)('Failed to check budget alerts', 500);
        }
    }
}
exports.BudgetService = BudgetService;
//# sourceMappingURL=BudgetService.js.map