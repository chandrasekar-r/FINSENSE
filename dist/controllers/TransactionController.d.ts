import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class TransactionController {
    private transactionService;
    private deepSeekService;
    constructor();
    getTransactions(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    createTransaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getTransaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateTransaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteTransaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getSpendingSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getCategorySummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=TransactionController.d.ts.map