import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import qrcode from 'qrcode'
import prisma from '../lib/prisma'
import { verifyToken, requireRole } from '../middleware/auth'
import { allocateSeats } from '../lib/seatingAlgorithm'

const router = Router()

// ── POST /api/admin/allocations/generate/:examId ──────────────────────────────
// Admin: trigger allocation for an exam
router.post('/generate/:examId',
  verifyToken, requireRole('ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const { examId } = req.params
    const { force = false } = req.body  // force=true to overwrite

    // Guard: block allocation < 24h before exam unless forced
    const exam = await prisma.exam.findUnique({ where: { id: examId } })
    if (!exam) { res.status(404).json({ error: 'Exam not found' }); return }

    const hoursUntilExam = (exam.date.getTime() - Date.now()) / 3600000
    // Only lock when the exam is in the future and starts within 24h (past exams stay editable for fixes/demo)
    if (hoursUntilExam >= 0 && hoursUntilExam < 24 && !force) {
      res.status(400).json({
        error: 'Allocation locked within 24h of exam. Pass force:true to override.'
      }); return
    }

    // Fetch students for this exam's branches
    const students = await prisma.studentProfile.findMany({
      where: { branch: { in: exam.branches } },
      select: { id: true, branch: true }
    })

    const concurrentExams = await prisma.exam.findMany({
      where: { date: exam.date, startTime: exam.startTime }
    })
    const concurrentExamIds = concurrentExams.map(ex => ex.id)

    const existingOccupancy = await prisma.seatAllocation.findMany({
      where: { examId: { in: concurrentExamIds } },
      include: { student: { select: { branch: true } } }
    })

    const occupiedByRoom = new Map<string, Map<string, { count: number, branches: string[] }>>()
    for (const alloc of existingOccupancy) {
      if (!occupiedByRoom.has(alloc.roomId)) occupiedByRoom.set(alloc.roomId, new Map())
      const seatKey = `${alloc.rowNo}-${alloc.colNo}`
      const map = occupiedByRoom.get(alloc.roomId)!
      if (!map.has(seatKey)) map.set(seatKey, { count: 0, branches: [] })

      const st = map.get(seatKey)!
      st.count += 1
      st.branches.push(alloc.student.branch)
    }

    // Fetch all rooms sorted by capacity and attach layout/occupancy metadata
    const rawRooms = await prisma.room.findMany({ orderBy: { capacity: 'desc' } })
    const rooms = rawRooms.map(room => ({
      ...room,
      occupiedSeats: occupiedByRoom.get(room.id) || new Map()
    }))

    // Filter out already allocated students for this exam so we only make incremental pushes
    const allocatedForThisExam = existingOccupancy
      .filter(a => a.examId === examId)
      .map(a => a.studentId)
    const allocatedSet = new Set(allocatedForThisExam)

    // Only place students who haven't been placed yet!
    const unallocatedStudents = students.filter(s => !allocatedSet.has(s.id))

    if (!unallocatedStudents.length) { res.status(400).json({ error: 'No unallocated students found for this exam' }); return }
    if (!rooms.length) { res.status(400).json({ error: 'No rooms available' }); return }

    // Incremental generation: REMOVED deleteMany so we keep existing data!

    // Run algorithm
    const { allocations, unplaced } = allocateSeats(unallocatedStudents, rooms)

    // Persist with signed QR tokens
    const records = await Promise.all(
      allocations.map(async a => {
        const payload = { studentId: a.studentId, examId, roomId: a.roomId, row: a.rowNo, col: a.colNo }
        const qrToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '30d' })
        return {
          examId,
          roomId: a.roomId,
          studentId: a.studentId,
          rowNo: a.rowNo,
          colNo: a.colNo,
          qrToken,
        }
      })
    )

    await prisma.seatAllocation.createMany({ data: records })

    res.json({
      placed: records.length,
      unplaced: unplaced.length,
      unplacedIds: unplaced,
    })
  }
)

// ── GET /api/admin/allocations/grid/:examId/:roomId ───────────────────────────
// Admin: get 2D grid for visualisation (legacy – still supported)
router.get('/grid/:examId/:roomId',
  verifyToken, requireRole('ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const { examId, roomId } = req.params
    const room = await prisma.room.findUnique({ where: { id: roomId } })
    const exam = await prisma.exam.findUnique({ where: { id: examId } })
    if (!room || !exam) { res.status(404).json({ error: 'Room or Exam not found' }); return }

    // Fetch all exams on the same date to overlay all branches
    const concurrentExams = await prisma.exam.findMany({ where: { date: exam.date } })
    const concurrentExamIds = concurrentExams.map(ex => ex.id)

    const allocs = await prisma.seatAllocation.findMany({
      where: { roomId, examId: { in: concurrentExamIds } },
      include: { student: { include: { user: { select: { name: true } } } } }
    })

    const grid: (any[])[][] = Array.from(
      { length: room.rows },
      () => Array.from({ length: room.seatsPerRow }, () => [])
    )

    for (const a of allocs) {
      if (a.rowNo < room.rows && a.colNo < room.seatsPerRow) {
        grid[a.rowNo]![a.colNo].push({
          studentId: a.studentId,
          name: a.student.user.name,
          rollNo: a.student.rollNo,
          branch: a.student.branch,
          status: a.status,
          seat: `R${a.rowNo + 1}C${a.colNo + 1}`,
          examId: a.examId,
        })
      }
    }

    res.json({ room: { id: room.id, name: room.name, rows: room.rows, cols: room.seatsPerRow }, grid })
  }
)

// ── GET /api/admin/allocations/grid-by-date/:roomId?date=YYYY-MM-DD ──────────
// Admin: fetch ALL students in a room for every exam on a given date.
// This is the incremental-aware endpoint used by the multi-branch grid viewer.
router.get('/grid-by-date/:roomId',
  verifyToken, requireRole('ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const { roomId } = req.params
    const dateStr = req.query.date as string | undefined

    const room = await prisma.room.findUnique({ where: { id: roomId } })
    if (!room) { res.status(404).json({ error: 'Room not found' }); return }

    // Build the date filter
    let dateFilter: { gte: Date; lt: Date } | undefined
    if (dateStr) {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) { res.status(400).json({ error: 'Invalid date' }); return }
      const next = new Date(d); next.setDate(next.getDate() + 1)
      dateFilter = { gte: d, lt: next }
    }

    // All exams on the chosen date (or all dates if none supplied)
    const exams = await prisma.exam.findMany({
      where: dateFilter ? { date: dateFilter } : undefined,
      orderBy: { startTime: 'asc' },
    })
    const examIds = exams.map(e => e.id)

    const allocs = await prisma.seatAllocation.findMany({
      where: { roomId, ...(examIds.length ? { examId: { in: examIds } } : {}) },
      include: { student: { include: { user: { select: { name: true } } } } },
    })

    // Build 2-D grid; each cell is an array (supports cap-2 seats)
    const grid: (any[])[][] = Array.from(
      { length: room.rows },
      () => Array.from({ length: room.seatsPerRow }, () => [])
    )

    for (const a of allocs) {
      if (a.rowNo < room.rows && a.colNo < room.seatsPerRow) {
        grid[a.rowNo]![a.colNo].push({
          studentId: a.studentId,
          name: a.student.user.name,
          rollNo: a.student.rollNo,
          branch: a.student.branch,
          status: a.status,
          seat: `R${a.rowNo + 1}C${a.colNo + 1}`,
          examId: a.examId,
        })
      }
    }

    // Collect distinct branches present in this grid
    const branchesPresent = [...new Set(allocs.map(a => a.student.branch))].sort()

    res.json({
      room: { id: room.id, name: room.name, rows: room.rows, cols: room.seatsPerRow },
      exams: exams.map(e => ({ id: e.id, subject: e.subject, branches: e.branches, startTime: e.startTime })),
      totalAllocated: allocs.length,
      branchesPresent,
      grid,
    })
  }
)

// ── GET /api/admin/allocations/summary/:examId ───────────────────────────────
router.get('/summary/:examId',
  verifyToken, requireRole('ADMIN'),
  async (req: Request, res: Response) => {
    const total = await prisma.seatAllocation.count({ where: { examId: req.params.examId } })
    const byRoom = await prisma.seatAllocation.groupBy({
      by: ['roomId'],
      where: { examId: req.params.examId },
      _count: { _all: true }
    })
    res.json({ total, byRoom })
  }
)

export default router
