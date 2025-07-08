import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class BudgetController {
    private budgetService;
    private notificationService;
    constructor();
    getBudgets(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    createBudget(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getBudget(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateBudget(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteBudget(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getBudgetStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=BudgetController.d.ts.map