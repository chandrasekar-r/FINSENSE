interface BudgetData {
    category_id: string;
    name: string;
    amount: number;
    currency: string;
    period_type: 'monthly' | 'weekly' | 'yearly';
    start_date: string;
    end_date?: string;
    alert_threshold?: number;
}
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
export declare class BudgetService {
    getBudgets(userId: string, includeStatus?: boolean): Promise<any[]>;
    createBudget(userId: string, data: BudgetData): Promise<any>;
    getBudgetById(budgetId: string, userId: string): Promise<any>;
    updateBudget(budgetId: string, userId: string, data: Partial<BudgetData>): Promise<any>;
    deleteBudget(budgetId: string, userId: string): Promise<void>;
    getBudgetStatus(budgetId: string, userId: string): Promise<BudgetStatus | null>;
    private calculateBudgetStatus;
    private calculateEndDate;
    checkAllBudgetsForAlerts(userId: string): Promise<BudgetStatus[]>;
}
export {};
//# sourceMappingURL=BudgetService.d.ts.map