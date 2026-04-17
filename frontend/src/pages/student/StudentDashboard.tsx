import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import {
  BookOpen, LogOut, Download, Calendar, Clock,
  MapPin, Hash, User, Sparkles, CheckCircle2, QrCode,
  Loader2, AlertCircle, ChevronDown
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { hallTicketAPI, studentAPI } from '../../lib/api'

interface HallTicket {
  student: { name: string; rollNo: string; branch: string }
  exam: { subject: string; date: string; startTime: string; endTime: string }
  seat: { room: string; building: string; row: number; col: number; code: string }
  qrToken: string
  qrDataUrl: string
}

interface Exam { id: string; subject: string; date: string }

export default function StudentDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [exams, setExams] = useState<Exam[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [ticket, setTicket] = useState<HallTicket | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [qrExpanded, setQrExpanded] = useState(false)

  useEffect(() => {
    studentAPI.myExams()
      .then(r => { setExams(r.data); if (r.data[0]) setSelectedId(r.data[0].id) })
      .catch(() => { })
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setLoading(true); setError(''); setTicket(null)
    hallTicketAPI.get(selectedId)
      .then(r => setTicket(r.data))
      .catch(err => setError(err?.response?.data?.error || 'No seat allocated yet'))
      .finally(() => setLoading(false))
  }, [selectedId])

  const handleLogout = () => { logout(); navigate('/login') }

  const downloadPDF = async () => {
    if (!selectedId) return
    try {
      const rawBlob = await hallTicketAPI.downloadPdf(selectedId)
      const pdfBlob = new Blob([rawBlob], { type: 'application/pdf' })
      const url = URL.createObjectURL(pdfBlob)

      // Build a clean filename from the ticket data already in state
      const safeName = ticket
        ? `HallTicket_${ticket.student.rollNo}_${ticket.exam.subject.replace(/[^a-z0-9]/gi, '_')}.pdf`
        : 'hall-ticket.pdf'

      const link = document.createElement('a')
      link.href = url
      link.download = safeName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(url), 2000)
      toast.success('Hall ticket downloaded!')
    } catch {
      toast.error('Could not download PDF. Try again or copy the QR token.')
    }
  }

  return (
    <div className="min-h-screen bg-mesh py-10 px-4 flex flex-col items-center">
      {/* Top bar */}
      <div className="w-full max-w-xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-600/30 border border-brand-500/30 flex items-center justify-center">
            <BookOpen size={16} className="text-brand-400" />
          </div>
          <span className="font-display font-bold text-white text-lg">ExamOps</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 glass-light rounded-full">
            <div className="w-6 h-6 rounded-full bg-emerald-600/50 flex items-center justify-center text-[10px] font-bold text-white">
              {user?.name?.[0] || 'S'}
            </div>
            <span className="text-xs text-slate-300 font-medium">{user?.rollNo || user?.name}</span>
          </div>
          <button onClick={handleLogout} className="p-2 glass-light rounded-xl text-slate-400 hover:text-red-400 transition-colors">
            <LogOut size={15} />
          </button>
        </div>
      </div>

      <div className="w-full max-w-xl space-y-4 animate-slide-up">
        {/* Exam selector */}
        {exams.length > 1 && (
          <div className="relative">
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="form-input pr-8 appearance-none cursor-pointer"
            >
              {exams.map(e => (
                <option key={e.id} value={e.id}>{e.subject} — {new Date(e.date).toLocaleDateString()}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        )}

        {!loading && exams.length === 0 && (
          <div className="glass rounded-3xl p-10 flex flex-col items-center gap-3 text-center">
            <AlertCircle size={32} className="text-slate-500" />
            <p className="text-white font-semibold text-sm">No hall tickets yet</p>
            <p className="text-slate-500 text-xs max-w-sm">
              You will see exams here after an admin runs seat allocation and assigns you a seat.
            </p>
          </div>
        )}

        {loading && (
          <div className="glass rounded-3xl p-16 flex flex-col items-center gap-4">
            <Loader2 size={32} className="text-brand-400 animate-spin" />
            <p className="text-slate-400 text-sm">Loading hall ticket…</p>
          </div>
        )}

        {!loading && error && (
          <div className="glass rounded-3xl p-10 flex flex-col items-center gap-4 text-center">
            <AlertCircle size={36} className="text-amber-400" />
            <div>
              <p className="text-white font-semibold">Hall Ticket Not Available</p>
              <p className="text-slate-500 text-sm mt-1">{error}</p>
              <p className="text-slate-600 text-xs mt-2">Seat allocation may not have been run yet. Check back after your exam coordinator completes allocation.</p>
            </div>
          </div>
        )}

        {!loading && ticket && (
          <>
            <div className="flex justify-center">
              <div className="chip bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-xs">
                <CheckCircle2 size={11} />Seat Allocated · Hall Ticket Ready
              </div>
            </div>

            <div className="glass rounded-3xl overflow-hidden">
              {/* Header */}
              <div className="p-6 text-center" style={{ background: 'linear-gradient(135deg,rgba(59,91,245,0.25),rgba(124,58,237,0.2))' }}>
                <p className="text-xs font-medium text-brand-300 uppercase tracking-widest mb-1">Hall Ticket</p>
                <h1 className="font-display text-2xl font-bold text-white">{ticket.student.name}</h1>
                <p className="text-slate-400 text-sm">{ticket.student.rollNo} · {ticket.student.branch}</p>
              </div>

              {/* Dashed divider */}
              <div className="flex items-center px-6">
                <div className="flex-1 border-t border-dashed border-white/10" />
                <div className="w-6 h-6 rounded-full bg-surface mx-2" />
                <div className="flex-1 border-t border-dashed border-white/10" />
              </div>

              {/* Details grid */}
              <div className="p-6 grid grid-cols-2 gap-4">
                {[
                  { icon: BookOpen, label: 'Subject', value: ticket.exam.subject },
                  { icon: Calendar, label: 'Date', value: new Date(ticket.exam.date).toDateString() },
                  { icon: Clock, label: 'Time', value: `${ticket.exam.startTime} – ${ticket.exam.endTime}` },
                  { icon: MapPin, label: 'Venue', value: `${ticket.seat.room}, ${ticket.seat.building}` },
                  { icon: Hash, label: 'Seat', value: `Row ${ticket.seat.row} · Seat ${ticket.seat.col}` },
                  { icon: User, label: 'Roll No', value: ticket.student.rollNo },
                ].map(item => (
                  <div key={item.label} className="glass-light rounded-xl p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <item.icon size={12} className="text-brand-400" />
                      <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{item.label}</span>
                    </div>
                    <p className="text-slate-200 text-sm font-medium leading-tight">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Dashed divider */}
              <div className="flex items-center px-6">
                <div className="flex-1 border-t border-dashed border-white/10" />
                <div className="w-6 h-6 rounded-full bg-surface mx-2" />
                <div className="flex-1 border-t border-dashed border-white/10" />
              </div>

              {/* QR section */}
              <div className="p-6 flex flex-col items-center gap-4">
                <div className="flex items-center gap-2">
                  <QrCode size={15} className="text-slate-400" />
                  <p className="text-xs text-slate-400 font-medium">Unique QR · Invigilator scans for attendance</p>
                </div>
                <button onClick={() => setQrExpanded(s => !s)} className="group relative">
                  <div className="bg-white p-4 rounded-2xl shadow-lg shadow-brand-600/20 transition-transform duration-300 group-hover:scale-105">
                    <QRCodeSVG value={ticket.qrToken} size={qrExpanded ? 200 : 140} level="H" fgColor="#1e2240" bgColor="#ffffff" />
                  </div>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 chip bg-brand-600/20 text-brand-300 border border-brand-500/30 text-[10px] whitespace-nowrap">
                    {qrExpanded ? 'Click to shrink' : 'Click to expand'}
                  </div>
                </button>
                <div className="mt-4 text-center space-y-1">
                  <p className="text-xs text-slate-500 font-mono">{ticket.qrToken.slice(0, 50)}…</p>
                  <div className="flex items-center gap-1.5 justify-center">
                    <Sparkles size={11} className="text-amber-400" />
                    <p className="text-[11px] text-slate-500">Keep this code safe. Do not share.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={downloadPDF} className="btn-primary flex-1 flex items-center justify-center gap-2 py-3">
                <Download size={16} />Download Hall Ticket PDF
              </button>
              <button onClick={() => { navigator.clipboard.writeText(ticket.qrToken); toast.success('QR token copied!') }}
                className="btn-secondary w-auto px-4 py-3 flex items-center gap-2">
                <QrCode size={16} />Copy QR
              </button>
            </div>

            {/* Instructions */}
            <div className="glass-light rounded-2xl p-5 space-y-3">
              <p className="text-xs font-semibold text-white uppercase tracking-wider">Instructions</p>
              <ul className="space-y-2 text-xs text-slate-400">
                {[
                  'Bring a printed or digital copy of this hall ticket on exam day.',
                  'Report to your assigned room at least 15 minutes before the exam.',
                  'The invigilator will scan your QR code to mark your attendance.',
                  'Mobile devices are not allowed inside the exam hall.',
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-brand-600/30 text-brand-400 flex-shrink-0 flex items-center justify-center text-[9px] font-bold mt-0.5">{i + 1}</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}