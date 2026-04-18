"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/student/exams — exams corresponding to the student's branch
router.get('/exams', auth_1.verifyToken, (0, auth_1.requireRole)('STUDENT'), async (req, res) => {
    try {
        const profile = await prisma_1.default.studentProfile.findUnique({ where: { userId: req.user.userId } });
        if (!profile) {
            res.status(404).json({ error: 'Student not found' });
            return;
        }
        const exams = await prisma_1.default.exam.findMany({
            where: { branches: { has: profile.branch } },
            orderBy: { date: 'asc' },
        });
        res.json(exams);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch exams' });
    }
});
exports.default = router;
//# sourceMappingURL=student.js.map