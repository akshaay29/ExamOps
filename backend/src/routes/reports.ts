import { Router, Request, Response } from 'express'
import type { Prisma } from '@prisma/client'
import { Parser } from 'json2csv'
import prisma from '../lib/prisma'
import { getSingleValue } from '../lib/http'
import { verifyToken, requireRole } from '../middleware/auth'

const router = Router()
router.use(verifyToken, requireRole('ADMIN'))

const REPORT_FIELDS = ['rollNo', 'name', 'branch', 'room', 'seat', 'status', 'scannedAt']

type AllocationRow = {
  rollNo: string
  name: string
  branch: string
  room: string
  seat: string
  status: string
  scannedAt: string
}

type AllocationWithStudentAndRoom = Prisma.SeatAllocationGetPayload<{
  include: {
    student: { include: { user: { select: { name: true } } } }
    room: true
  }
}>

function toRow(a: AllocationWithStudentAndRoom): AllocationRow {
  return {
    rollNo:    a.student?.rollNo   ?? '',
    name:      a.student?.user?.name ?? '',
    branch:    a.student?.branch   ?? '',
    room:      a.room?.name        ?? '',
    seat:      `R${a.rowNo + 1}C${a.colNo + 1}`,
    status:    a.status,
    scannedAt: a.scannedAt?.toISOString() ?? '',
  }
}

function buildCsv(rows: AllocationRow[]): string {
  if (rows.length === 0) return REPORT_FIELDS.join(',')
  return new Parser({ fields: REPORT_FIELDS }).parse(rows)
}

// ── GET /api/admin/reports/attendance/:examId ─────────────────────────────────
router.get('/attendance/:examId', async (req: Request, res: Response): Promise<void> => {
  try {
    const examId = getSingleValue(req.params.examId)
    if (!examId) { res.status(400).json({ error: 'Exam id is required' }); return }

    const exam = await prisma.exam.findUnique({ where: { id: examId } })
    if (!exam) { res.status(404).json({ error: 'Exam not found' }); return }

    const allocations = await prisma.seatAllocation.findMany({
      where: { examId },
      include: {
        student: { include: { user: { select: { name: true } } } },
        room:    { select: { name: true, building: true } },
      },
      orderBy: [{ room: { name: 'asc' } }, { rowNo: 'asc' }, { colNo: 'asc' }],
    }) as AllocationWithStudentAndRoom[]

    const total    = allocations.length
    const present  = allocations.filter(a => a.status === 'PRESENT').length
    const absent   = allocations.filter(a => a.status === 'ABSENT').length
    const unmarked = allocations.filter(a => a.status === 'UNMARKED').length

    const branchBreakdown: Record<string, { total: number; present: number }> = {}
    for (const a of allocations) {
      const b = a.student?.branch ?? 'Unknown'
      if (!branchBreakdown[b]) branchBreakdown[b] = { total: 0, present: 0 }
      branchBreakdown[b].total++
      if (a.status === 'PRESENT') branchBreakdown[b].present++
    }

    res.json({
      exam,
      summary: { total, present, absent, unmarked },
      branchBreakdown,
      rows: allocations.map(toRow),
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to generate attendance report' })
  }
})

// ── GET /api/admin/reports/attendance/:examId/csv ─────────────────────────────
router.get('/attendance/:examId/csv', async (req: Request, res: Response): Promise<void> => {
  try {
    const examId = getSingleValue(req.params.examId)
    if (!examId) { res.status(400).json({ error: 'Exam id is required' }); return }

    const exam = await prisma.exam.findUnique({ where: { id: examId } })
    if (!exam) { res.status(404).json({ error: 'Exam not found' }); return }

    const allocations = await prisma.seatAllocation.findMany({
      where: { examId },
      include: { student: { include: { user: { select: { name: true } } } }, room: true },
    }) as AllocationWithStudentAndRoom[]

    const csv = buildCsv(allocations.map(toRow))

    res.attachment('attendance_report.csv')
    res.send(csv)
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Failed to export CSV' })
  }
})

// ── GET /api/admin/reports/dashboard ──────────────────────────────────────────
router.get('/dashboard', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totalStudents, totalRooms, totalExams, totalAllocations, presentCount] = await Promise.all([
      prisma.studentProfile.count(),
      prisma.room.count(),
      prisma.exam.count(),
      prisma.seatAllocation.count(),
      prisma.seatAllocation.count({ where: { status: 'PRESENT' } }),
    ])

    const upcomingExams = await prisma.exam.findMany({
      where:   { date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      take:    5,
    })

    res.json({ totalStudents, totalRooms, totalExams, totalAllocations, presentCount, upcomingExams })
  } catch (error: any) {
    res.status(500).json({
      error: error.message ?? 'Failed to load dashboard',
      totalStudents: 0, totalRooms: 0, totalExams: 0,
      totalAllocations: 0, presentCount: 0, upcomingExams: [],
    })
  }
})

export default router
