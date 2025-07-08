import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class UserController {
    getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteAccount(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=UserController.d.ts.map