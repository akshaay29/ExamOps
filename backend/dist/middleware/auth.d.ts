import { Request, Response, NextFunction } from 'express';
export type Role = 'ADMIN' | 'STUDENT' | 'INVIGILATOR';
export interface TokenPayload {
    userId: string;
    role: Role;
}
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}
export declare function verifyToken(req: Request, res: Response, next: NextFunction): void;
export declare function requireRole(...roles: Role[]): (req: Request, res: Response, next: NextFunction) => void;
