interface TransactionFilters {
    category?: string;
    startDate?: string;
    endDate?: string;
    type?: string;
}
interface TransactionData {
    category_id: string;
    amount: number;
    description: string;
    transaction_date?: string;
    merchant_name?: string;
    vendor_name?: string;
    currency?: string;
    transaction_type?: string;
}
export declare class TransactionService {
    getTransactions(userId: string, page?: number, limit?: number, filters?: TransactionFilters): Promise<{
        transactions: any[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    createTransaction(userId: string, data: TransactionData): Promise<any>;
    getTransactionById(transactionId: string, userId: string): Promise<any>;
    updateTransaction(transactionId: string, userId: string, data: Partial<TransactionData>): Promise<any>;
    deleteTransaction(transactionId: string, userId: string): Promise<void>;
    getSpendingSummary(userId: string, period?: string): Promise<{
        period: string;
        totalIncome: number;
        totalExpenses: number;
        netAmount: number;
        totalTransactions: number;
        incomeCount: number;
        expenseCount: number;
    }>;
    getCategorySummary(userId: string, period?: string): Promise<{
        period: string;
        categories: {
            id: any;
            name: any;
            color: any;
            icon: any;
            totalSpent: number;
            totalIncome: number;
            transactionCount: number;
            percentage: number;
        }[];
    }>;
    getCategoryIdByName(userId: string, categoryName: string): Promise<string | null>;
}
export {};
//# sourceMappingURL=TransactionService.d.ts.map