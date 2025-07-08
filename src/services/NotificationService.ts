import { pool } from '../config/database';
import { createError } from '../middleware/errorHandler';

interface BudgetStatus {
  id: string;
  name: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  daysRemaining: number;
  alertTriggered: boolean;
  status: 'on_track' | 'warning' | 'over_budget';
  categoryName: string;
  periodType: string;
}

interface NotificationData {
  user_id: string;
  type: 'budget_alert' | 'spending_summary' | 'goal_achieved';
  title: string;
  message: string;
  data?: any;
  is_read?: boolean;
}

export class NotificationService {
  async sendBudgetAlert(userId: string, budgetStatus: BudgetStatus): Promise<void> {
    try {
      // Check if we've already sent this alert recently (within last 24 hours)
      const recentAlertQuery = `
        SELECT id FROM notifications
        WHERE user_id = $1 
          AND type = 'budget_alert'
          AND data->>'budgetId' = $2
          AND created_at > NOW() - INTERVAL '24 hours'
      `;

      const recentAlert = await pool.query(recentAlertQuery, [userId, budgetStatus.id]);

      if (recentAlert.rows.length > 0) {
        return; // Don't send duplicate alerts within 24 hours
      }

      let title: string;
      let message: string;

      if (budgetStatus.status === 'over_budget') {
        title = '🚨 Budget Exceeded!';
        message = `You've exceeded your "${budgetStatus.name}" budget by $${Math.abs(budgetStatus.remainingAmount).toFixed(2)}. Consider reviewing your spending in the ${budgetStatus.categoryName} category.`;
      } else if (budgetStatus.status === 'warning') {
        title = '⚠️ Budget Warning';
        message = `You've used ${budgetStatus.percentageUsed}% of your "${budgetStatus.name}" budget. $${budgetStatus.remainingAmount.toFixed(2)} remaining for ${budgetStatus.daysRemaining} days.`;
      } else {
        return; // No alert needed for on_track status
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
    } catch (error) {
      // Don't throw errors for notification failures to avoid disrupting main flow
      console.error('Failed to send budget alert:', error);
    }
  }

  async createNotification(data: NotificationData): Promise<void> {
    try {
      const query = `
        INSERT INTO notifications (user_id, type, title, message, data, is_read)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await pool.query(query, [
        data.user_id,
        data.type,
        data.title,
        data.message,
        JSON.stringify(data.data || {}),
        data.is_read || false
      ]);
    } catch (error) {
      throw createError('Failed to create notification', 500);
    }
  }

  async getUserNotifications(userId: string, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = 'SELECT COUNT(*) FROM notifications WHERE user_id = $1';
      const countResult = await pool.query(countQuery, [userId]);
      const total = parseInt(countResult.rows[0].count);

      // Get notifications
      const query = `
        SELECT id, type, title, message, data, is_read, created_at
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(query, [userId, limit, offset]);

      return {
        notifications: result.rows.map((row: any) => ({
          ...row,
          data: JSON.parse(row.data)
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
        unreadCount: await this.getUnreadCount(userId)
      };
    } catch (error) {
      throw createError('Failed to retrieve notifications', 500);
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const query = `
        UPDATE notifications
        SET is_read = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
      `;

      const result = await pool.query(query, [notificationId, userId]);

      if (result.rowCount === 0) {
        throw createError('Notification not found', 404);
      }
    } catch (error) {
      throw createError('Failed to mark notification as read', 500);
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      const query = `
        UPDATE notifications
        SET is_read = true, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND is_read = false
      `;

      await pool.query(query, [userId]);
    } catch (error) {
      throw createError('Failed to mark all notifications as read', 500);
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as unread_count
        FROM notifications
        WHERE user_id = $1 AND is_read = false
      `;

      const result = await pool.query(query, [userId]);
      return parseInt(result.rows[0].unread_count);
    } catch (error) {
      return 0;
    }
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      const query = `
        DELETE FROM notifications
        WHERE id = $1 AND user_id = $2
      `;

      const result = await pool.query(query, [notificationId, userId]);

      if (result.rowCount === 0) {
        throw createError('Notification not found', 404);
      }
    } catch (error) {
      throw createError('Failed to delete notification', 500);
    }
  }

  async sendSpendingSummary(userId: string, summary: any): Promise<void> {
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
    } catch (error) {
      console.error('Failed to send spending summary:', error);
    }
  }

  async sendGoalAchievement(userId: string, goalData: any): Promise<void> {
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
    } catch (error) {
      console.error('Failed to send goal achievement:', error);
    }
  }
}