import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { verifyToken, requireRole } from '../middleware/auth'

const router = Router()

// GET /api/student/exams — exams corresponding to the student's branch
router.get('/exams', verifyToken, requireRole('STUDENT'), async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.userId } })
    if (!profile) {
      res.status(404).json({ error: 'Student not found' })
      return
    }

    const exams = await prisma.exam.findMany({
      where: { branches: { has: profile.branch } },
      orderBy: { date: 'asc' },
    })

    res.json(exams)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exams' })
  }
})

export default router
