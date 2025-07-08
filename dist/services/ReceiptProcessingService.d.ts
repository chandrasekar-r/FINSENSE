interface ParsedReceiptData {
    merchantName?: string;
    totalAmount?: number;
    currency?: string;
    date?: string;
    category?: string;
    items?: Array<{
        name: string;
        amount: number;
        quantity?: number;
        category?: string;
    }>;
    confidence: number;
}
interface ReceiptRecord {
    id: string;
    user_id: string;
    filename: string;
    file_type: string;
    extracted_text: string;
    parsed_data: ParsedReceiptData;
    status: string;
    created_at: string;
}
export declare class ReceiptProcessingService {
    private deepSeekService;
    createReceiptRecord(userId: string, filename: string, fileType: string, extractedText: string, parsedData: ParsedReceiptData): Promise<ReceiptRecord>;
    getReceiptById(receiptId: string, userId: string): Promise<ReceiptRecord | null>;
    createTransactionFromReceipt(receiptId: string, userId: string, confirmedData: any): Promise<{
        id: string;
    }>;
    private getOrCreateCategory;
}
export declare function setReceiptProgress(jobId: string, progress: number, status?: string): Promise<void>;
export declare function getReceiptProgress(jobId: string): Promise<{
    progress: number;
    status: string;
}>;
export {};
//# sourceMappingURL=ReceiptProcessingService.d.ts.map