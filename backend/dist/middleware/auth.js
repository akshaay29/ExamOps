"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = verifyToken;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function verifyToken(req, res, next) {
    const header = req.headers.authorization;
    const queryToken = req.query.token;
    // Pehle header dekho, nahi toh query parameter
    const token = header?.startsWith('Bearer ') ? header.slice(7) : queryToken;
    if (!token) {
        res.status(401).json({ error: 'Missing or invalid token' });
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    }
    catch {
        res.status(401).json({ error: 'Token expired or invalid' });
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthenticated' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map