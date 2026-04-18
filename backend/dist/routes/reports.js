"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const json2csv_1 = require("json2csv");
const prisma_1 = __importDefault(require("../lib/prisma"));
const http_1 = require("../lib/http");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken, (0, auth_1.requireRole)('ADMIN'));
const REPORT_FIELDS = ['rollNo', 'name', 'branch', 'room', 'seat', 'status', 'scannedAt'];
function toRow(a) {
    return {
        rollNo: a.student?.rollNo ?? '',
        name: a.student?.user?.name ?? '',
        branch: a.student?.branch ?? '',
        room: a.room?.name ?? '',
        seat: `R${a.rowNo + 1}C${a.colNo + 1}`,
        status: a.status,
        scannedAt: a.scannedAt?.toISOString() ?? '',
    };
}
function buildCsv(rows) {
    if (rows.length === 0)
        return REPORT_FIELDS.join(',');
    return new json2csv_1.Parser({ fields: REPORT_FIELDS }).parse(rows);
}
// ── GET /api/admin/reports/attendance/:examId ─────────────────────────────────
router.get('/attendance/:examId', async (req, res) => {
    try {
        const examId = (0, http_1.getSingleValue)(req.params.examId);
        if (!examId) {
            res.status(400).json({ error: 'Exam id is required' });
            return;
        }
        const exam = await prisma_1.default.exam.findUnique({ where: { id: examId } });
        if (!exam) {
            res.status(404).json({ error: 'Exam not found' });
            return;
        }
        const allocations = await prisma_1.default.seatAllocation.findMany({
            where: { examId },
            include: {
                student: { include: { user: { select: { name: true } } } },
                room: { select: { name: true, building: true } },
            },
            orderBy: [{ room: { name: 'asc' } }, { rowNo: 'asc' }, { colNo: 'asc' }],
        });
        const total = allocations.length;
        const present = allocations.filter(a => a.status === 'PRESENT').length;
        const absent = allocations.filter(a => a.status === 'ABSENT').length;
        const unmarked = allocations.filter(a => a.status === 'UNMARKED').length;
        const branchBreakdown = {};
        for (const a of allocations) {
            const b = a.student?.branch ?? 'Unknown';
            if (!branchBreakdown[b])
                branchBreakdown[b] = { total: 0, present: 0 };
            branchBreakdown[b].total++;
            if (a.status === 'PRESENT')
                branchBreakdown[b].present++;
        }
        res.json({
            exam,
            summary: { total, present, absent, unmarked },
            branchBreakdown,
            rows: allocations.map(toRow),
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message ?? 'Failed to generate attendance report' });
    }
});
// ── GET /api/admin/reports/attendance/:examId/csv ─────────────────────────────
router.get('/attendance/:examId/csv', async (req, res) => {
    try {
        const examId = (0, http_1.getSingleValue)(req.params.examId);
        if (!examId) {
            res.status(400).json({ error: 'Exam id is required' });
            return;
        }
        const exam = await prisma_1.default.exam.findUnique({ where: { id: examId } });
        if (!exam) {
            res.status(404).json({ error: 'Exam not found' });
            return;
        }
        const allocations = await prisma_1.default.seatAllocation.findMany({
            where: { examId },
            include: { student: { include: { user: { select: { name: true } } } }, room: true },
        });
        const csv = buildCsv(allocations.map(toRow));
        res.attachment('attendance_report.csv');
        res.send(csv);
    }
    catch (error) {
        res.status(500).json({ error: error.message ?? 'Failed to export CSV' });
    }
});
// ── GET /api/admin/reports/dashboard ──────────────────────────────────────────
router.get('/dashboard', async (_req, res) => {
    try {
        const [totalStudents, totalRooms, totalExams, totalAllocations, presentCount] = await Promise.all([
            prisma_1.default.studentProfile.count(),
            prisma_1.default.room.count(),
            prisma_1.default.exam.count(),
            prisma_1.default.seatAllocation.count(),
            prisma_1.default.seatAllocation.count({ where: { status: 'PRESENT' } }),
        ]);
        const upcomingExams = await prisma_1.default.exam.findMany({
            where: { date: { gte: new Date() } },
            orderBy: { date: 'asc' },
            take: 5,
        });
        res.json({ totalStudents, totalRooms, totalExams, totalAllocations, presentCount, upcomingExams });
    }
    catch (error) {
        res.status(500).json({
            error: error.message ?? 'Failed to load dashboard',
            totalStudents: 0, totalRooms: 0, totalExams: 0,
            totalAllocations: 0, presentCount: 0, upcomingExams: [],
        });
    }
});
exports.default = router;
//# sourceMappingURL=reports.js.map