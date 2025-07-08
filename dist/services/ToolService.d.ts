interface ToolResult {
    success: boolean;
    data?: any;
    message: string;
}
interface Tool {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, any>;
        required: string[];
    };
}
export declare class ToolService {
    private transactionService;
    private budgetService;
    private categoryService;
    constructor();
    getAvailableTools(): Tool[];
    executeTool(toolName: string, parameters: any, userId: string): Promise<ToolResult>;
    private addTransaction;
    private updateTransaction;
    private deleteTransaction;
    private createBudget;
    private updateBudget;
    private deleteBudget;
    private createCategory;
    private getTransactions;
    private getSpendingAnalysis;
    private getBudgets;
    private createBudgetWithCategory;
}
export {};
//# sourceMappingURL=ToolService.d.ts.map