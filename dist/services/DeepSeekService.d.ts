interface ParsedReceiptData {
    merchantName?: string;
    totalAmount?: number;
    currency?: string;
    date?: string;
    category?: string;
    items: Array<{
        name: string;
        amount: number;
        quantity?: number;
    }>;
    confidence: number;
}
interface FinancialContext {
    totalSpending: number;
    recentTransactions: Array<any>;
    budgets: Array<any>;
    categories: Array<any>;
}
export declare class DeepSeekService {
    private apiKey;
    private baseUrl;
    private model;
    private toolService;
    constructor();
    parseReceiptData(extractedText: string): Promise<ParsedReceiptData>;
    processFinancialQuery(message: string, context: FinancialContext, userId?: string): Promise<string>;
    processFinancialQueryStream(message: string, context: FinancialContext, onChunk: (chunk: string) => void, userId?: string, history?: any[]): Promise<void>;
    suggestCategory(transactionDescription: string, amount: number): Promise<string>;
    suggestCategoryForItem(itemName: string, amount?: number): Promise<string>;
    private makeReceiptParsingRequest;
    private makeAPIRequest;
    private makeAPIRequestStream;
    private makeAPIRequestWithTools;
    private makeAPIRequestWithToolsStream;
    private makeAPIRequestWithToolResultsStream;
    private makeAPIRequestWithToolResults;
    private validateParsedData;
}
export {};
//# sourceMappingURL=DeepSeekService.d.ts.map