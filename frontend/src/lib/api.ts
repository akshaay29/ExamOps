/**
 * api.ts — Axios client wired to the ExamOps backend
 * All requests attach the stored JWT automatically.
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({ baseURL: BASE_URL })

// Attach JWT from localStorage on every request
api.interceptors.request.use(cfg => {
  try {
    const raw = localStorage.getItem('examops_auth')
    if (raw) {
      const { token } = JSON.parse(raw) as { token: string }
      if (token) cfg.headers.Authorization = `Bearer ${token}`
    }
  } catch {}
  return cfg
})

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (body: Record<string, string>) => api.post('/api/auth/login', body),
  register: (body: Record<string, string>) => api.post('/api/auth/register', body),
  sendOtp: (body: { rollNo: string }) => api.post('/api/auth/send-otp', body),
  verifyLink: (token: string) => api.get('/api/auth/verify-link', { params: { token } }),
  magicLink: (body: { email: string }) => api.post('/api/auth/magic-link', body),
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const roomsAPI = {
  list:   ()           => api.get('/api/admin/rooms'),
  create: (body: object) => api.post('/api/admin/rooms', body),
  update: (id: string, body: object) => api.put(`/api/admin/rooms/${id}`, body),
  delete: (id: string) => api.delete(`/api/admin/rooms/${id}`),
  upload: (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post('/api/admin/rooms/upload', fd)
  }
}

export const studentsAPI = {
  list:   ()           => api.get('/api/admin/students'),
  upload: (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post('/api/admin/students/upload', fd)
  },
  delete: (id: string) => api.delete(`/api/admin/students/${id}`),
  deleteAll: () => api.delete('/api/admin/students/all'),
}

export const examsAPI = {
  list:   ()                   => api.get('/api/admin/exams'),
  create: (body: object)        => api.post('/api/admin/exams', body),
  update: (id: string, b: object) => api.put(`/api/admin/exams/${id}`, b),
  delete: (id: string)          => api.delete(`/api/admin/exams/${id}`),
}

export const allocationAPI = {
  generate: (examId: string, force = false) =>
    api.post(`/api/admin/allocations/generate/${examId}`, { force }),
  grid:    (examId: string, roomId: string) =>
    api.get(`/api/admin/allocations/grid/${examId}/${roomId}`),
  /** Fetch ALL allocations for a room on a specific date and time period (all branches combined). */
  gridByDate: (roomId: string, date: string, startTime?: string, endTime?: string) =>
    api.get(`/api/admin/allocations/grid-by-date/${roomId}`, { params: { date, startTime, endTime } }),
  summary: (examId: string) =>
    api.get(`/api/admin/allocations/summary/${examId}`),
}

export const reportsAPI = {
  attendance: (examId: string) => api.get(`/api/admin/reports/attendance/${examId}`),
  csv:        (examId: string) => `${BASE_URL}/api/admin/reports/attendance/${examId}/csv`,
  dashboard:  ()               => api.get('/api/admin/reports/dashboard'),
}

// ── Student ───────────────────────────────────────────────────────────────────
export const studentAPI = {
  /** Exams the logged-in student has a seat allocation for (not the full admin exam list). */
  myExams: () => api.get('/api/student/exams'),
}

export const hallTicketAPI = {
  get:    (examId: string) => api.get(`/api/student/hall-ticket/${examId}`),
  pdfUrl: (examId: string) => `${BASE_URL}/api/student/hall-ticket/${examId}/pdf`,
  /** PDF requires JWT; use this instead of opening pdfUrl in a new tab. */
  downloadPdf: async (examId: string) => {
    const res = await api.get(`/api/student/hall-ticket/${examId}/pdf`, { responseType: 'blob' })
    return res.data as Blob
  },
}

// ── Invigilator ───────────────────────────────────────────────────────────────
export const attendanceAPI = {
  roomList: (roomId: string, examId: string) =>
    api.get(`/api/invigilator/attendance/room/${roomId}/${examId}`),
  scan:   (qrToken: string) => api.post('/api/invigilator/attendance/scan', { qrToken }),
  toggle: (allocationId: string, status: string) =>
    api.post('/api/invigilator/attendance/toggle', { allocationId, status }),
}
