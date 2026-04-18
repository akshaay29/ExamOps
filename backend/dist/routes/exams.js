"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const http_1 = require("../lib/http");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
function parseBranches(raw) {
    if (Array.isArray(raw))
        return raw.map((b) => String(b).trim()).filter(Boolean);
    if (typeof raw === 'string')
        return raw.split(',').map((b) => b.trim()).filter(Boolean);
    return [];
}
// GET /api/admin/exams — admins see all; invigilators need the same list to run attendance
router.get('/', auth_1.verifyToken, (0, auth_1.requireRole)('ADMIN', 'INVIGILATOR'), async (_req, res) => {
    const exams = await prisma_1.default.exam.findMany({ orderBy: { date: 'asc' } });
    res.json(exams);
});
router.use(auth_1.verifyToken, (0, auth_1.requireRole)('ADMIN'));
// POST /api/admin/exams
router.post('/', async (req, res) => {
    const { id, subject, date, startTime, endTime, branches } = req.body;
    const parsedBranches = parseBranches(branches);
    if (!id || !subject || !date || !startTime || !endTime || parsedBranches.length === 0) {
        res.status(400).json({ error: 'All fields required' });
        return;
    }
    try {
        const exam = await prisma_1.default.exam.create({
            data: { id, subject, date: new Date(date), startTime, endTime, branches: parsedBranches }
        });
        res.status(201).json(exam);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to create exam' });
    }
});
// PUT /api/admin/exams/:id
router.put('/:id', async (req, res) => {
    const { subject, date, startTime, endTime, branches } = req.body;
    const parsedBranches = parseBranches(branches);
    const examId = (0, http_1.getSingleValue)(req.params.id);
    if (!examId) {
        res.status(400).json({ error: 'Exam id is required' });
        return;
    }
    try {
        const exam = await prisma_1.default.exam.update({
            where: { id: examId },
            data: { subject, date: new Date(date), startTime, endTime, branches: parsedBranches }
        });
        res.json(exam);
    }
    catch {
        res.status(404).json({ error: 'Exam not found' });
    }
});
// DELETE /api/admin/exams/:id
router.delete('/:id', async (req, res) => {
    const examId = (0, http_1.getSingleValue)(req.params.id);
    if (!examId) {
        res.status(400).json({ error: 'Exam id is required' });
        return;
    }
    await prisma_1.default.exam.delete({ where: { id: examId } }).catch(() => null);
    res.json({ deleted: true });
});
exports.default = router;
//# sourceMappingURL=exams.js.map