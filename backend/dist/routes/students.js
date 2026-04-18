"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const sync_1 = require("csv-parse/sync");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const http_1 = require("../lib/http");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken, (0, auth_1.requireRole)('ADMIN'));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// GET /api/admin/students
router.get('/', async (_req, res) => {
    const students = await prisma_1.default.studentProfile.findMany({
        include: { user: { select: { name: true, email: true } } },
        orderBy: { rollNo: 'asc' }
    });
    res.json(students);
});
// POST /api/admin/students/upload — CSV bulk import
// CSV columns: roll_no, name, branch, dob (YYYY-MM-DD), email
router.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'No CSV file uploaded' });
        return;
    }
    const text = req.file.buffer.toString('utf-8');
    let records;
    try {
        records = (0, sync_1.parse)(text, { columns: true, trim: true, skip_empty_lines: true });
    }
    catch {
        res.status(400).json({ error: 'Invalid CSV format' });
        return;
    }
    const results = { created: 0, skipped: 0, errors: [] };
    for (const row of records) {
        // Standardize column access (CSV might have 'roll_no' or 'rollno', 'nameid' or 'name')
        const rRollNo = row.rollno || row.roll_no || row.roll_num || '';
        const rName = row.nameid || row.name || row.student_name || 'Unknown';
        const rBranch = row.branch || row.department || 'Unknown';
        const rDob = row.dob || '2004-01-01'; // Default if not provided
        const rEmail = row.email || null;
        if (!rRollNo || !rName) {
            results.errors.push(`Row skipped — missing fields: ${JSON.stringify(row)}`);
            results.skipped++;
            continue;
        }
        try {
            // Use roll_no as default password (hashed)
            const hash = await bcrypt_1.default.hash(rRollNo, 10);
            await prisma_1.default.user.create({
                data: {
                    name: rName,
                    email: rEmail,
                    passwordHash: hash,
                    role: 'STUDENT',
                    student: {
                        create: {
                            rollNo: rRollNo,
                            dob: new Date(rDob),
                            branch: rBranch,
                        }
                    }
                }
            });
            results.created++;
        }
        catch (err) {
            if (err.code === 'P2002') {
                results.skipped++;
                continue;
            }
            results.errors.push(`${rRollNo}: ${err.message}`);
        }
    }
    res.json(results);
});
// DELETE /api/admin/students/all
router.delete('/all', async (_req, res) => {
    try {
        const [, , users] = await prisma_1.default.$transaction([
            prisma_1.default.seatAllocation.deleteMany({
                where: { student: { user: { role: 'STUDENT' } } }
            }),
            prisma_1.default.studentProfile.deleteMany({}),
            prisma_1.default.user.deleteMany({ where: { role: 'STUDENT' } }),
        ]);
        res.json({ deleted: true, count: users.count });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to delete students' });
    }
});
// DELETE /api/admin/students/:id
router.delete('/:id', async (req, res) => {
    try {
        const studentId = (0, http_1.getSingleValue)(req.params.id);
        if (!studentId) {
            res.status(400).json({ error: 'Student id is required' });
            return;
        }
        const profile = await prisma_1.default.studentProfile.findUnique({ where: { id: studentId } });
        if (!profile) {
            res.status(404).json({ error: 'Student not found' });
            return;
        }
        await prisma_1.default.user.delete({ where: { id: profile.userId } });
        res.json({ deleted: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to delete student' });
    }
});
exports.default = router;
//# sourceMappingURL=students.js.map