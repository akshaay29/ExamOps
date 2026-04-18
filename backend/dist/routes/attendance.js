"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const http_1 = require("../lib/http");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ── GET /api/invigilator/attendance/room/:roomId/:examId ──────────────────────
// Invigilator: view all students in their assigned room
router.get('/room/:roomId/:examId', auth_1.verifyToken, (0, auth_1.requireRole)('INVIGILATOR'), async (req, res) => {
    try {
        const roomId = (0, http_1.getSingleValue)(req.params.roomId);
        const examId = (0, http_1.getSingleValue)(req.params.examId);
        if (!roomId || !examId) {
            res.status(400).json({ error: 'roomId and examId are required' });
            return;
        }
        const allocations = await prisma_1.default.seatAllocation.findMany({
            where: { roomId, examId },
            include: {
                student: {
                    include: { user: { select: { name: true } } }
                }
            },
            orderBy: [{ rowNo: 'asc' }, { colNo: 'asc' }]
        });
        res.json(allocations.map(a => ({
            id: a.id,
            studentId: a.studentId,
            name: a.student.user?.name || 'Unknown', // Protected against orphaned references
            rollNo: a.student.rollNo,
            branch: a.student.branch,
            seat: `R${a.rowNo + 1}C${a.colNo + 1}`,
            rowNo: a.rowNo,
            colNo: a.colNo,
            status: a.status,
            scannedAt: a.scannedAt,
        })));
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch room allocations' });
    }
});
// ── POST /api/invigilator/attendance/scan ─────────────────────────────────────
// Invigilator: scan a QR token to mark student present
router.post('/scan', auth_1.verifyToken, (0, auth_1.requireRole)('INVIGILATOR'), async (req, res) => {
    try {
        const { qrToken } = req.body;
        if (!qrToken) {
            res.status(400).json({ error: 'qrToken required' });
            return;
        }
        const cleanToken = qrToken.toString().trim();
        let alloc = null;
        // Ensure backward compatibility: Check if token is a standard encoded JWT
        if (cleanToken.startsWith('eyJ')) {
            let payload;
            try {
                payload = jsonwebtoken_1.default.verify(cleanToken, process.env.JWT_SECRET);
            }
            catch (err) {
                res.status(400).json({ error: 'Invalid or expired JWT token' });
                return;
            }
            // Safe lookup verifying the token geometry
            alloc = await prisma_1.default.seatAllocation.findUnique({
                where: { examId_roomId_rowNo_colNo: { examId: payload.examId, roomId: payload.roomId, rowNo: payload.row, colNo: payload.col } },
                include: { student: { include: { user: { select: { name: true } } } } }
            });
            if (!alloc || alloc.studentId !== payload.studentId) {
                res.status(404).json({ error: 'Allocation record not found or student mismatch' });
                return;
            }
        }
        else {
            // Fallback or explicit simple ID matching
            alloc = await prisma_1.default.seatAllocation.findUnique({
                where: { id: cleanToken },
                include: { student: { include: { user: { select: { name: true } } } } }
            });
            if (!alloc) {
                res.status(404).json({ error: 'Allocation record not found' });
                return;
            }
        }
        // Duplicate scan check
        if (alloc.status === 'PRESENT') {
            res.status(409).json({
                error: 'Already scanned',
                student: { name: alloc.student.user?.name || 'Unknown', rollNo: alloc.student.rollNo },
                scannedAt: alloc.scannedAt,
            });
            return;
        }
        const updated = await prisma_1.default.seatAllocation.update({
            where: { id: alloc.id },
            data: { status: 'PRESENT', scannedAt: new Date(), scannedBy: req.user.userId }
        });
        res.json({
            success: true,
            student: { name: alloc.student.user?.name || 'Unknown', rollNo: alloc.student.rollNo, branch: alloc.student.branch },
            seat: `R${updated.rowNo + 1}C${updated.colNo + 1}`,
            scannedAt: updated.scannedAt,
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to process scan' });
    }
});
// ── POST /api/invigilator/attendance/toggle ───────────────────────────────────
// Invigilator: manually mark present/absent/unmarked
router.post('/toggle', auth_1.verifyToken, (0, auth_1.requireRole)('INVIGILATOR'), async (req, res) => {
    try {
        const { allocationId, status } = req.body;
        if (!allocationId || !['PRESENT', 'ABSENT', 'UNMARKED'].includes(status)) {
            res.status(400).json({ error: 'allocationId and status (PRESENT|ABSENT|UNMARKED) required' });
            return;
        }
        const updated = await prisma_1.default.seatAllocation.update({
            where: { id: allocationId },
            data: {
                status,
                scannedAt: status === 'PRESENT' ? new Date() : null,
                scannedBy: status === 'PRESENT' ? req.user.userId : null,
            }
        });
        res.json({ success: true, id: updated.id, status: updated.status });
    }
    catch (err) {
        // Prisma's P2025: Record to update not found
        if (err.code === 'P2025') {
            res.status(404).json({ error: 'Allocation not found' });
            return;
        }
        res.status(500).json({ error: 'Failed to update attendance status' });
    }
});
exports.default = router;
//# sourceMappingURL=attendance.js.map