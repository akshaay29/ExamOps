import { Router, Request, Response } from 'express'
import multer from 'multer'
import { parse } from 'csv-parse/sync'
import prisma from '../lib/prisma'
import { verifyToken, requireRole } from '../middleware/auth'

const router = Router()

const upload = multer({ storage: multer.memoryStorage() })

// GET /api/admin/rooms — invigilators need room list for attendance UI
router.get('/', verifyToken, requireRole('ADMIN', 'INVIGILATOR'), async (_req: Request, res: Response) => {
  const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } })
  res.json(rooms)
})

router.use(verifyToken, requireRole('ADMIN'))

// POST /api/admin/rooms/upload
router.post('/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: 'No CSV attached' }); return }
  const text = req.file.buffer.toString('utf-8')
  let records: Record<string, string>[]
  try { records = parse(text, { columns: true, trim: true, skip_empty_lines: true }) }
  catch { res.status(400).json({ error: 'Invalid CSV format' }); return }

  const results = { created: 0, skipped: 0 }
  for (const row of records) {
    const name = row.room_no || row.room_name || row.name
    const building = row.floor || row.building || 'Main'
    const rows = Number(row.rows || 10)
    const seatsPerRow = Number(row.cols || row.seats_per_row || 10)
    if (!name) { results.skipped++; continue }
    try {
      await prisma.room.upsert({
        where: { name },
        update: { building, rows, seatsPerRow, capacity: rows * seatsPerRow },
        create: { name, building, rows, seatsPerRow, capacity: rows * seatsPerRow }
      })
      results.created++
    } catch { results.skipped++ }
  }
  res.json(results)
})

// POST /api/admin/rooms
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { name, building, rows, seatsPerRow, layout, capacity } = req.body
  if (!name || !building || !rows || !seatsPerRow) {
    res.status(400).json({ error: 'name, building, rows, seatsPerRow required' }); return
  }

  const room = await prisma.room.create({
    data: { 
      name, 
      building, 
      rows: Number(rows), 
      seatsPerRow: Number(seatsPerRow), 
      capacity: capacity ? Number(capacity) : Number(rows) * Number(seatsPerRow),
      layout: layout || null
    }
  })
  res.status(201).json(room)
})

// PUT /api/admin/rooms/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { name, building, rows, seatsPerRow } = req.body
  try {
    const room = await prisma.room.update({
      where: { id: req.params.id },
      data: { name, building, rows: Number(rows), seatsPerRow: Number(seatsPerRow), capacity: rows * seatsPerRow }
    })
    res.json(room)
  } catch {
    res.status(404).json({ error: 'Room not found' })
  }
})

// DELETE /api/admin/rooms/:id
router.delete('/:id', async (req: Request, res: Response) => {
  await prisma.room.delete({ where: { id: req.params.id } }).catch(() => null)
  res.json({ deleted: true })
})

export default router
