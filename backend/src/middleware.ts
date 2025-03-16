import { JWT_SECRET } from ".";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

// Extend the Request type to include userId
interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        res.status(401).json({ message: "You are not logged in" });
        return; // Ensure function exits after sending response
    }

    try {
        const decoded = jwt.verify(authHeader, JWT_SECRET) as { userId?: string };

        if (decoded.userId) {
            req.userId = decoded.userId; // Attach userId to req
            next();
        } else {
            res.status(403).json({ message: "Invalid token" });
        }
    } catch (e) {
        res.status(403).json({ message: "You are not logged in" });
    }
}
