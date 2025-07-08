import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class ReceiptController {
    private ocrService;
    private deepSeekService;
    private receiptService;
    constructor();
    uploadReceipt(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getReceiptData(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    confirmReceiptData(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=ReceiptController.d.ts.map