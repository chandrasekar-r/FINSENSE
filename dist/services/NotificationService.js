"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
class NotificationService {
    async sendBudgetAlert(userId, budgetStatus) {
        try {
            const recentAlertQuery = `
        SELECT id FROM notifications
        WHERE user_id = $1 
          AND type = 'budget_alert'
          AND data->>'budgetId' = $2
          AND created_at > NOW() - INTERVAL '24 hours'
      `;
            const recentAlert = await database_1.pool.query(recentAlertQuery, [userId, budgetStatus.id]);
            if (recentAlert.rows.length > 0) {
                return;
            }
            let title;
            let message;
            if (budgetStatus.status === 'over_budget') {
                title = '🚨 Budget Exceeded!';
                message = `You've exceeded your "${budgetStatus.name}" budget by $${Math.abs(budgetStatus.remainingAmount).toFixed(2)}. Consider reviewing your spending in the ${budgetStatus.categoryName} category.`;
            }
            else if (budgetStatus.status === 'warning') {
                title = '⚠️ Budget Warning';
                message = `You've used ${budgetStatus.percentageUsed}% of your "${budgetStatus.name}" budget. $${budgetStatus.remainingAmount.toFixed(2)} remaining for ${budgetStatus.daysRemaining} days.`;
            }
            else {
                return;
            }
            await this.createNotification({
                user_id: userId,
                type: 'budget_alert',
                title,
                message,
                data: {
                    budgetId: budgetStatus.id,
                    budgetName: budgetStatus.name,
                    categoryName: budgetStatus.categoryName,
                    percentageUsed: budgetStatus.percentageUsed,
                    remainingAmount: budgetStatus.remainingAmount,
                    status: budgetStatus.status
                },
                is_read: false
            });
        }
        catch (error) {
            console.error('Failed to send budget alert:', error);
        }
    }
    async createNotification(data) {
        try {
            const query = `
        INSERT INTO notifications (user_id, type, title, message, data, is_read)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
            await database_1.pool.query(query, [
                data.user_id,
                data.type,
                data.title,
                data.message,
                JSON.stringify(data.data || {}),
                data.is_read || false
            ]);
        }
        catch (error) {
            throw (0, errorHandler_1.createError)('Failed to create notification', 500);
        }
    }
    async getUserNotifications(userId, page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;
            const countQuery = 'SELECT COUNT(*) FROM notifications WHERE user_id = $1';
            const countResult = await database_1.pool.query(countQuery, [userId]);
            const total = parseInt(countResult.rows[0].count);
            const query = `
        SELECT id, type, title, message, data, is_read, created_at
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
            const result = await database_1.pool.query(query, [userId, limit, offset]);
            return {
                notifications: result.rows.map((row) => ({
                    ...row,
                    data: JSON.parse(row.data)
                })),
                total,
                page,
                totalPages: Math.ceil(total / limit),
                unreadCount: await this.getUnreadCount(userId)
            };
        }
        catch (error) {
            throw (0, errorHandler_1.createError)('Failed to retrieve notifications', 500);
        }
    }
    async markAsRead(notificationId, userId) {
        try {
            const query = `
        UPDATE notifications
        SET is_read = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
      `;
            const result = await database_1.pool.query(query, [notificationId, userId]);
            if (result.rowCount === 0) {
                throw (0, errorHandler_1.createError)('Notification not found', 404);
            }
        }
        catch (error) {
            throw (0, errorHandler_1.createError)('Failed to mark notification as read', 500);
        }
    }
    async markAllAsRead(userId) {
        try {
            const query = `
        UPDATE notifications
        SET is_read = true, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND is_read = false
      `;
            await database_1.pool.query(query, [userId]);
        }
        catch (error) {
            throw (0, errorHandler_1.createError)('Failed to mark all notifications as read', 500);
        }
    }
    async getUnreadCount(userId) {
        try {
            const query = `
        SELECT COUNT(*) as unread_count
        FROM notifications
        WHERE user_id = $1 AND is_read = false
      `;
            const result = await database_1.pool.query(query, [userId]);
            return parseInt(result.rows[0].unread_count);
        }
        catch (error) {
            return 0;
        }
    }
    async deleteNotification(notificationId, userId) {
        try {
            const query = `
        DELETE FROM notifications
        WHERE id = $1 AND user_id = $2
      `;
            const result = await database_1.pool.query(query, [notificationId, userId]);
            if (result.rowCount === 0) {
                throw (0, errorHandler_1.createError)('Notification not found', 404);
            }
        }
        catch (error) {
            throw (0, errorHandler_1.createError)('Failed to delete notification', 500);
        }
    }
    async sendSpendingSummary(userId, summary) {
        try {
            const title = '📊 Weekly Spending Summary';
            const message = `This week: $${summary.totalExpenses} spent across ${summary.expenseCount} transactions. ${summary.totalExpenses > summary.lastWeekExpenses ? 'Higher' : 'Lower'} than last week.`;
            await this.createNotification({
                user_id: userId,
                type: 'spending_summary',
                title,
                message,
                data: summary,
                is_read: false
            });
        }
        catch (error) {
            console.error('Failed to send spending summary:', error);
        }
    }
    async sendGoalAchievement(userId, goalData) {
        try {
            const title = '🎉 Goal Achieved!';
            const message = `Congratulations! You've successfully ${goalData.type === 'savings' ? 'saved' : 'stayed within budget for'} ${goalData.description}.`;
            await this.createNotification({
                user_id: userId,
                type: 'goal_achieved',
                title,
                message,
                data: goalData,
                is_read: false
            });
        }
        catch (error) {
            console.error('Failed to send goal achievement:', error);
        }
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=NotificationService.js.map