import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRouter       from './routes/auth'
import roomsRouter      from './routes/rooms'
import studentsRouter   from './routes/students'
import examsRouter      from './routes/exams'
import allocationRouter from './routes/allocation'
import hallTicketRouter from './routes/hallTicket'
import studentRouter    from './routes/student'
import attendanceRouter from './routes/attendance'
import reportsRouter    from './routes/reports'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 8000

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ExamOps API' }))

// Routes
app.use('/api/auth',       authRouter)
app.use('/api/admin/rooms',     roomsRouter)
app.use('/api/admin/students',  studentsRouter)
app.use('/api/admin/exams',     examsRouter)
app.use('/api/admin/allocations', allocationRouter)
app.use('/api/student', studentRouter)
app.use('/api/student/hall-ticket', hallTicketRouter)
app.use('/api/invigilator/attendance', attendanceRouter)
app.use('/api/admin/reports',   reportsRouter)

app.listen(PORT, () => console.log(`🚀 ExamOps API running on port ${PORT}`))
