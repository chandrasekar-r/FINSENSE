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
export declare class ChatService {
    saveChatInteraction(userId: string, userMessage: string, aiResponse: string): Promise<void>;
    getChatHistory(userId: string, page?: number, limit?: number): Promise<{
        messages: ChatMessage[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    clearChatHistory(userId: string): Promise<void>;
    getUserFinancialContext(userId: string): Promise<FinancialContext>;
}
export {};
//# sourceMappingURL=ChatService.d.ts.map