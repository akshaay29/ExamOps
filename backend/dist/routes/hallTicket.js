"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pdfkit_1 = __importDefault(require("pdfkit"));
const qrcode_1 = __importDefault(require("qrcode"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const http_1 = require("../lib/http");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ── GET /api/student/hall-ticket/:examId  (JSON metadata) ─────────────────────
router.get('/:examId', auth_1.verifyToken, (0, auth_1.requireRole)('STUDENT'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const examId = (0, http_1.getSingleValue)(req.params.examId);
        if (!examId) {
            res.status(400).json({ error: 'Exam id is required' });
            return;
        }
        const profile = await prisma_1.default.studentProfile.findUnique({
            where: { userId },
            include: { user: { select: { name: true } } },
        });
        if (!profile) {
            res.status(404).json({ error: 'Student not found' });
            return;
        }
        const alloc = await prisma_1.default.seatAllocation.findFirst({
            where: { studentId: profile.id, examId },
            include: { exam: true, room: true }
        });
        if (!alloc) {
            res.status(404).json({ error: 'Seating not yet assigned for this exam' });
            return;
        }
        const qrDataUrl = await qrcode_1.default.toDataURL(alloc.id, { errorCorrectionLevel: 'H', margin: 2 });
        res.json({
            student: { name: profile.user?.name || 'Unknown', rollNo: profile.rollNo, branch: profile.branch },
            exam: { subject: alloc.exam.subject, date: alloc.exam.date, startTime: alloc.exam.startTime, endTime: alloc.exam.endTime },
            seat: { room: alloc.room.name, building: alloc.room.building, row: alloc.rowNo + 1, col: alloc.colNo + 1, code: `R${alloc.rowNo + 1}C${alloc.colNo + 1}` },
            qrToken: alloc.id,
            qrDataUrl,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch hall ticket data' });
    }
});
// ── GET /api/student/hall-ticket/:examId/pdf  (PDF binary) ───────────────────
router.get('/:examId/pdf', auth_1.verifyToken, (0, auth_1.requireRole)('STUDENT'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const examId = (0, http_1.getSingleValue)(req.params.examId);
        if (!examId) {
            res.status(400).json({ error: 'Exam id is required' });
            return;
        }
        const profile = await prisma_1.default.studentProfile.findUnique({
            where: { userId },
            include: { user: { select: { name: true } } }
        });
        if (!profile) {
            res.status(404).json({ error: 'Student not found' });
            return;
        }
        const alloc = await prisma_1.default.seatAllocation.findFirst({
            where: { studentId: profile.id, examId },
            include: { exam: true, room: true }
        });
        if (!alloc) {
            res.status(404).json({ error: 'Seating not yet assigned for this exam' });
            return;
        }
        // Generate QR PNG buffer using simplified ID
        const qrBuffer = await qrcode_1.default.toBuffer(alloc.id, {
            errorCorrectionLevel: 'H',
            width: 200,
            margin: 2,
        });
        // Build PDF (Pipe the doc logic as before, just not directly to res)
        const doc = new pdfkit_1.default({ size: 'A5', margin: 40 });
        // ── Header bar ────────────────────────────────
        doc.rect(0, 0, doc.page.width, 80).fill('#1e2240');
        doc.fillColor('#ffffff')
            .fontSize(20).font('Helvetica-Bold')
            .text('HALL TICKET', 40, 20, { align: 'center' });
        doc.fontSize(10).font('Helvetica')
            .text(`ExamOps · College Exam Management`, 40, 46, { align: 'center' });
        // ── Student info ──────────────────────────────
        doc.fillColor('#1e2240').fontSize(11).font('Helvetica-Bold');
        doc.text('Student Name:', 40, 100);
        doc.text('Roll Number:', 40, 120);
        doc.text('Branch:', 40, 140);
        doc.font('Helvetica').fillColor('#374151');
        doc.text(profile.user?.name || 'Unknown', 160, 100);
        doc.text(profile.rollNo, 160, 120);
        doc.text(profile.branch, 160, 140);
        // ── Divider ───────────────────────────────────
        doc.moveTo(40, 164).lineTo(doc.page.width - 40, 164).strokeColor('#e5e7eb').stroke();
        // ── Exam details ──────────────────────────────
        doc.fillColor('#1e2240').fontSize(11).font('Helvetica-Bold');
        doc.text('Subject:', 40, 175);
        doc.text('Date:', 40, 195);
        doc.text('Time:', 40, 215);
        doc.text('Venue:', 40, 235);
        doc.text('Seat:', 40, 255);
        doc.font('Helvetica').fillColor('#374151');
        doc.text(alloc.exam.subject, 160, 175);
        doc.text(new Date(alloc.exam.date).toDateString(), 160, 195);
        doc.text(`${alloc.exam.startTime} – ${alloc.exam.endTime}`, 160, 215);
        doc.text(`${alloc.room.name}, ${alloc.room.building}`, 160, 235);
        doc.text(`Row ${alloc.rowNo + 1}, Seat ${alloc.colNo + 1}`, 160, 255);
        // ── QR code ───────────────────────────────────
        doc.moveTo(40, 280).lineTo(doc.page.width - 40, 280).strokeColor('#e5e7eb').stroke();
        const qrX = (doc.page.width - 200) / 2;
        doc.image(qrBuffer, qrX, 295, { width: 200, height: 200 });
        doc.fillColor('#6b7280').fontSize(9).font('Helvetica')
            .text('Scan QR code for attendance · Do not share', 40, 505, { align: 'center' });
        // Accumulate PDF buffer dynamically
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        doc.on('end', () => {
            const result = Buffer.concat(chunks);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="hall-ticket.pdf"');
            res.setHeader('Content-Length', result.length);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            res.send(result);
        });
        doc.end();
    }
    catch (error) {
        if (!res.headersSent)
            res.status(500).json({ error: 'Failed to generate PDF' });
    }
});
exports.default = router;
//# sourceMappingURL=hallTicket.js.map