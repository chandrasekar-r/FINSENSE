import { Request, Response, NextFunction } from 'express';
export interface CustomError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}
export declare const errorHandler: (error: CustomError, req: Request, res: Response, next: NextFunction) => void;
export declare const createError: (message: string, statusCode: number) => CustomError;
//# sourceMappingURL=errorHandler.d.ts.map