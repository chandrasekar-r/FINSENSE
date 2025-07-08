import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class ChatController {
    private deepSeekService;
    private chatService;
    constructor();
    processQuery(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    processQueryStream(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getChatHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    clearChatHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=ChatController.d.ts.map