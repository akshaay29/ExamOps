import { Router, Request, Response } from 'express'
import multer from 'multer'
import { parse } from 'csv-parse/sync'
import bcrypt from 'bcrypt'
import prisma from '../lib/prisma'
import { verifyToken, requireRole } from '../middleware/auth'

const router = Router()
router.use(verifyToken, requireRole('ADMIN'))

const upload = multer({ storage: multer.memoryStorage() })

// GET /api/admin/students
router.get('/', async (_req: Request, res: Response) => {
  const students = await prisma.studentProfile.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { rollNo: 'asc' }
  })
  res.json(students)
})

// POST /api/admin/students/upload — CSV bulk import
// CSV columns: roll_no, name, branch, dob (YYYY-MM-DD), email
router.post('/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: 'No CSV file uploaded' }); return }

  const text = req.file.buffer.toString('utf-8')
  let records: Record<string, string>[]
  try {
    records = parse(text, { columns: true, trim: true, skip_empty_lines: true })
  } catch {
    res.status(400).json({ error: 'Invalid CSV format' }); return
  }

  const results = { created: 0, skipped: 0, errors: [] as string[] }

  for (const row of records) {
    // Standardize column access (CSV might have 'roll_no' or 'rollno', 'nameid' or 'name')
    const rRollNo = row.rollno || row.roll_no || row.roll_num || ''
    const rName   = row.nameid || row.name || row.student_name || 'Unknown'
    const rBranch = row.branch || row.department || 'Unknown'
    const rDob    = row.dob || '2004-01-01'  // Default if not provided
    const rEmail  = row.email || null

    if (!rRollNo || !rName) {
      results.errors.push(`Row skipped — missing fields: ${JSON.stringify(row)}`)
      results.skipped++
      continue
    }
    try {
      // Use roll_no as default password (hashed)
      const hash = await bcrypt.hash(rRollNo, 10)
      await prisma.user.create({
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
      })
      results.created++
    } catch (err: any) {
      if (err.code === 'P2002') { results.skipped++; continue }
      results.errors.push(`${rRollNo}: ${err.message}`)
    }
  }

  res.json(results)
})

// DELETE /api/admin/students/all
router.delete('/all', async (_req: Request, res: Response) => {
  try {
    const [, , users] = await prisma.$transaction([
      prisma.seatAllocation.deleteMany({
        where: { student: { user: { role: 'STUDENT' } } }
      }),
      prisma.studentProfile.deleteMany({}),
      prisma.user.deleteMany({ where: { role: 'STUDENT' } }),
    ])
    res.json({ deleted: true, count: users.count })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete students' })
  }
})

// DELETE /api/admin/students/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await prisma.studentProfile.findUnique({ where: { id: req.params.id } })
    if (!profile) {
      res.status(404).json({ error: 'Student not found' })
      return
    }
    await prisma.user.delete({ where: { id: profile.userId } })
    res.json({ deleted: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete student' })
  }
})

export default router
