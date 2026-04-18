"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const sync_1 = require("csv-parse/sync");
const prisma_1 = __importDefault(require("../lib/prisma"));
const http_1 = require("../lib/http");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// GET /api/admin/rooms — invigilators need room list for attendance UI
router.get('/', auth_1.verifyToken, (0, auth_1.requireRole)('ADMIN', 'INVIGILATOR'), async (_req, res) => {
    const rooms = await prisma_1.default.room.findMany({ orderBy: { name: 'asc' } });
    res.json(rooms);
});
router.use(auth_1.verifyToken, (0, auth_1.requireRole)('ADMIN'));
// POST /api/admin/rooms/upload
router.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'No CSV attached' });
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
    const results = { created: 0, skipped: 0 };
    for (const row of records) {
        const name = row.room_no || row.room_name || row.name;
        const building = row.floor || row.building || 'Main';
        const rows = Number(row.rows || 10);
        const seatsPerRow = Number(row.cols || row.seats_per_row || 10);
        if (!name) {
            results.skipped++;
            continue;
        }
        try {
            await prisma_1.default.room.upsert({
                where: { name },
                update: { building, rows, seatsPerRow, capacity: rows * seatsPerRow },
                create: { name, building, rows, seatsPerRow, capacity: rows * seatsPerRow }
            });
            results.created++;
        }
        catch {
            results.skipped++;
        }
    }
    res.json(results);
});
// POST /api/admin/rooms
router.post('/', async (req, res) => {
    const { name, building, rows, seatsPerRow, layout, capacity } = req.body;
    if (!name || !building || !rows || !seatsPerRow) {
        res.status(400).json({ error: 'name, building, rows, seatsPerRow required' });
        return;
    }
    const room = await prisma_1.default.room.create({
        data: {
            name,
            building,
            rows: Number(rows),
            seatsPerRow: Number(seatsPerRow),
            capacity: capacity ? Number(capacity) : Number(rows) * Number(seatsPerRow),
            layout: layout || null
        }
    });
    res.status(201).json(room);
});
// PUT /api/admin/rooms/:id
router.put('/:id', async (req, res) => {
    const { name, building, rows, seatsPerRow } = req.body;
    const roomId = (0, http_1.getSingleValue)(req.params.id);
    if (!roomId) {
        res.status(400).json({ error: 'Room id is required' });
        return;
    }
    try {
        const room = await prisma_1.default.room.update({
            where: { id: roomId },
            data: { name, building, rows: Number(rows), seatsPerRow: Number(seatsPerRow), capacity: rows * seatsPerRow }
        });
        res.json(room);
    }
    catch {
        res.status(404).json({ error: 'Room not found' });
    }
});
// DELETE /api/admin/rooms/:id
router.delete('/:id', async (req, res) => {
    const roomId = (0, http_1.getSingleValue)(req.params.id);
    if (!roomId) {
        res.status(400).json({ error: 'Room id is required' });
        return;
    }
    await prisma_1.default.room.delete({ where: { id: roomId } }).catch(() => null);
    res.json({ deleted: true });
});
exports.default = router;
//# sourceMappingURL=rooms.js.map