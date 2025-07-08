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
export declare class NotificationService {
    sendBudgetAlert(userId: string, budgetStatus: BudgetStatus): Promise<void>;
    createNotification(data: NotificationData): Promise<void>;
    getUserNotifications(userId: string, page?: number, limit?: number): Promise<{
        notifications: any[];
        total: number;
        page: number;
        totalPages: number;
        unreadCount: number;
    }>;
    markAsRead(notificationId: string, userId: string): Promise<void>;
    markAllAsRead(userId: string): Promise<void>;
    getUnreadCount(userId: string): Promise<number>;
    deleteNotification(notificationId: string, userId: string): Promise<void>;
    sendSpendingSummary(userId: string, summary: any): Promise<void>;
    sendGoalAchievement(userId: string, goalData: any): Promise<void>;
}
export {};
//# sourceMappingURL=NotificationService.d.ts.map