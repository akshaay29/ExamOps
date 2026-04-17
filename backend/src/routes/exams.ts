import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { verifyToken, requireRole } from '../middleware/auth'

const router = Router()

function parseBranches(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((b) => String(b).trim()).filter(Boolean)
  if (typeof raw === 'string') return raw.split(',').map((b) => b.trim()).filter(Boolean)
  return []
}

// GET /api/admin/exams — admins see all; invigilators need the same list to run attendance
router.get('/', verifyToken, requireRole('ADMIN', 'INVIGILATOR'), async (_req: Request, res: Response) => {
  const exams = await prisma.exam.findMany({ orderBy: { date: 'asc' } })
  res.json(exams)
})

router.use(verifyToken, requireRole('ADMIN'))

// POST /api/admin/exams
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { id, subject, date, startTime, endTime, branches } = req.body
  const parsedBranches = parseBranches(branches)
  if (!id || !subject || !date || !startTime || !endTime || parsedBranches.length === 0) {
    res.status(400).json({ error: 'All fields required' }); return
  }
  try {
    const exam = await prisma.exam.create({
      data: { id, subject, date: new Date(date), startTime, endTime, branches: parsedBranches }
    })
    res.status(201).json(exam)
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create exam' })
  }
})

// PUT /api/admin/exams/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { subject, date, startTime, endTime, branches } = req.body
  const parsedBranches = parseBranches(branches)
  try {
    const exam = await prisma.exam.update({
      where: { id: req.params.id },
      data: { subject, date: new Date(date), startTime, endTime, branches: parsedBranches }
    })
    res.json(exam)
  } catch {
    res.status(404).json({ error: 'Exam not found' })
  }
})

// DELETE /api/admin/exams/:id
router.delete('/:id', async (req: Request, res: Response) => {
  await prisma.exam.delete({ where: { id: req.params.id } }).catch(() => null)
  res.json({ deleted: true })
})

export default router
