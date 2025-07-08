import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class CategoryController {
    private categoryService;
    constructor();
    getCategories(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    createCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=CategoryController.d.ts.map