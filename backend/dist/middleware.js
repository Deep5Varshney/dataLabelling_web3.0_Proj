"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const _1 = require(".");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authMiddleware(req, res, next) {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        res.status(401).json({ message: "You are not logged in" });
        return; // Ensure function exits after sending response
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(authHeader, _1.JWT_SECRET);
        if (decoded.userId) {
            req.userId = decoded.userId; // Attach userId to req
            next();
        }
        else {
            res.status(403).json({ message: "Invalid token" });
        }
    }
    catch (e) {
        res.status(403).json({ message: "You are not logged in" });
    }
}
