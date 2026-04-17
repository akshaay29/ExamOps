import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Html5Qrcode } from 'html5-qrcode'
import {
  BookOpen, LogOut, QrCode, CheckCircle2, XCircle,
  ToggleLeft, ToggleRight, Search, Camera, CameraOff,
  Users, Clock, Wifi, Loader2, ChevronDown
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { attendanceAPI, examsAPI, roomsAPI } from '../../lib/api'

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'UNMARKED'

interface Student {
  id: string; roll: string; name: string; branch: string; seat: string
  status: AttendanceStatus; scannedAt?: string
}

interface Exam { id: string; subject: string; date: string }
interface Room { id: string; name: string; building: string }

// ─── QR Scanner widget ────────────────────────────────────────────────────────
function QRScannerWidget({ onScan }: { onScan: (token: string) => void }) {
  const regionId = useRef(`qr-region-${Math.random().toString(36).slice(2, 11)}`).current
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError]   = useState('')

  const stop = useCallback(async () => {
    const s = scannerRef.current
    scannerRef.current = null
    if (s) {
      try {
        await s.stop()
        await s.clear()
      } catch { /* already stopped */ }
    }
    setActive(false)
  }, [])

  const start = async () => {
    try {
      setError('')
      const html5 = new Html5Qrcode(regionId, { verbose: false })
      scannerRef.current = html5
      await html5.start(
        { facingMode: 'environment' },
        { fps: 30, qrbox: { width: 250, height: 250 } },
        (decodedText) => { onScan(decodedText) },
        () => { /* no QR in frame */ }
      )
      setActive(true)
    } catch {
      setError('Camera access denied or scanner failed. Paste token or use manual toggle.')
      scannerRef.current = null
    }
  }

  useEffect(() => () => { void stop() }, [stop])

  return (
    <div className="glass-light rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2"><QrCode size={16} className="text-brand-400" /><span className="text-sm font-semibold text-white">QR Scanner</span></div>
        <div className={`flex items-center gap-1.5 text-xs font-medium ${active ? 'text-emerald-400' : 'text-slate-500'}`}>
          <Wifi size={12} className={active ? 'animate-pulse' : ''} />{active ? 'Live' : 'Inactive'}
        </div>
      </div>
      <div className="relative bg-black/60 min-h-[208px] overflow-hidden">
        <div id={regionId} className="w-full min-h-[208px]" />
        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 bg-black/50">
            <Camera size={32} className="text-slate-600" />
            <p className="text-slate-500 text-xs text-center">{error || 'Start camera to scan the hall-ticket QR, or paste the token.'}</p>
          </div>
        )}
        {active && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-36 h-36 relative">
              {['top-0 left-0 border-t-2 border-l-2 rounded-tl-lg','top-0 right-0 border-t-2 border-r-2 rounded-tr-lg',
                'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg','bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg'
              ].map(cls => <div key={cls} className={`absolute w-7 h-7 border-brand-400 ${cls}`} />)}
              <div className="absolute left-1 right-1 top-1/2 h-0.5 bg-brand-400/70 animate-pulse" />
            </div>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-3">
        <button type="button" onClick={() => { void (active ? stop() : start()) }}
          className={`w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 border
            ${active ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30' : 'bg-brand-600/20 text-brand-300 border-brand-500/30 hover:bg-brand-600/30'}`}>
          {active ? <><CameraOff size={15}/>Stop</> : <><Camera size={15}/>Start Camera</>}
        </button>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Paste JWT token..."
            onKeyDown={e => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                onScan(e.currentTarget.value.trim())
                e.currentTarget.value = ''
              }
            }}
            className="form-input flex-1 text-xs"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Student row ──────────────────────────────────────────────────────────────
function StudentRow({ student, onToggle }: { student: Student; onToggle: (id: string, s: AttendanceStatus) => void }) {
  const cfg: Record<AttendanceStatus, { color: string; icon: React.ElementType; label: string }> = {
    PRESENT:  { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2, label: 'Present' },
    ABSENT:   { color: 'text-red-400 bg-red-500/10 border-red-500/20',             icon: XCircle,     label: 'Absent'  },
    UNMARKED: { color: 'text-slate-500 bg-white/5 border-white/10',                icon: Clock,       label: 'Unmarked'},
  }
  const c = cfg[student.status]; const Icon = c.icon
  const cycle = (s: AttendanceStatus): AttendanceStatus => s === 'UNMARKED' ? 'PRESENT' : s === 'PRESENT' ? 'ABSENT' : 'UNMARKED'

  return (
    <tr className="border-b border-white/5 hover:bg-white/3 transition-colors">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-600/30 flex items-center justify-center text-xs font-bold text-brand-300">{student.name[0]}</div>
          <div><p className="text-slate-200 text-sm font-medium">{student.name}</p><p className="text-slate-500 text-xs font-mono">{student.roll}</p></div>
        </div>
      </td>
      <td className="px-4 py-3.5"><span className="chip bg-brand-600/20 text-brand-300 border border-brand-500/20 text-[10px]">{student.branch}</span></td>
      <td className="px-4 py-3.5 text-xs text-slate-400 font-mono">{student.seat}</td>
      <td className="px-4 py-3.5"><span className={`chip border text-xs ${c.color}`}><Icon size={11}/>{c.label}</span></td>
      <td className="px-4 py-3.5">
        <button onClick={() => onToggle(student.id, cycle(student.status))} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all">
          {student.status === 'PRESENT' ? <ToggleRight size={18} className="text-emerald-400" /> : <ToggleLeft size={18}/>}
        </button>
      </td>
    </tr>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function InvigilatorDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [exams,      setExams]      = useState<Exam[]>([])
  const [rooms,      setRooms]      = useState<Room[]>([])
  const [examId,     setExamId]     = useState('')
  const [roomId,     setRoomId]     = useState('')
  const [students,   setStudents]   = useState<Student[]>([])
  const [search,     setSearch]     = useState('')
  const [loading,    setLoading]    = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([examsAPI.list(), roomsAPI.list()]).then(([e, r]) => {
      setExams(e.data); setRooms(r.data)
      if (e.data[0]) setExamId(e.data[0].id)
      if (r.data[0]) setRoomId(r.data[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!examId || !roomId) return
    setLoading(true)
    attendanceAPI.roomList(roomId, examId)
      .then(r => setStudents(r.data.map((s: any) => ({
        id: s.id, roll: s.rollNo, name: s.name, branch: s.branch,
        seat: s.seat, status: s.status as AttendanceStatus, scannedAt: s.scannedAt
      }))))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false))
  }, [examId, roomId])

  const toggle = async (id: string, status: AttendanceStatus) => {
    // 1. Capture target student BEFORE the optimistic update/API call
    const st = students.find(s => s.id === id)
    if (!st) return

    try {
      await attendanceAPI.toggle(id, status)

      // 2. Perform optimistic internal state update
      setStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s))

      // 3. Render safe toasts based on captured details
      if (status === 'PRESENT') toast.success(`${st.name} marked present`)
      else if (status === 'ABSENT') toast.error(`${st.name} marked absent`, { icon: '⚠️' })
      else toast(`${st.name} reset to unmarked`, { icon: '↩️' })
    } catch {
      toast.error('Failed to update attendance')
    }
  }

  const handleScan = async (token: string) => {
    try {
      const res = await attendanceAPI.scan(token)
      const { student: s } = res.data
      setStudents(prev => prev.map(st => st.roll === s.rollNo ? { ...st, status: 'PRESENT', scannedAt: new Date().toISOString() } : st))
      setLastScanned(s.rollNo)
      toast.success(`${s.name} marked present via QR`, { duration: 3000 })
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Scan failed'
      if (msg.includes('Already')) toast(msg, { icon: '🔁' })
      else toast.error(msg)
    }
  }

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.roll.toLowerCase().includes(search.toLowerCase())
  )
  const present  = students.filter(s => s.status === 'PRESENT').length
  const absent   = students.filter(s => s.status === 'ABSENT').length
  const unmarked = students.filter(s => s.status === 'UNMARKED').length
  const selExam  = exams.find(e => e.id === examId)
  const selRoom  = rooms.find(r => r.id === roomId)

  return (
    <div className="min-h-screen bg-mesh">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface-card/80 backdrop-blur border-b border-surface-border px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-600/30 border border-amber-500/30 flex items-center justify-center">
            <BookOpen size={15} className="text-amber-400" />
          </div>
          <div>
            <p className="text-white text-sm font-bold font-display">{selRoom ? `${selRoom.name} · ${selRoom.building}` : 'Select Room'}</p>
            <p className="text-slate-500 text-xs">{selExam ? `${selExam.subject} · ${new Date(selExam.date).toLocaleDateString()}` : 'Select Exam'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="chip bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px]">Invigilator</span>
          <button onClick={() => { logout(); navigate('/login') }} className="p-2 glass-light rounded-xl text-slate-400 hover:text-red-400 transition-colors"><LogOut size={15}/></button>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Exam + Room selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1.5">Exam</label>
            <div className="relative">
              <select value={examId} onChange={e => setExamId(e.target.value)} className="form-input pr-8 appearance-none cursor-pointer">
                {exams.map(e => <option key={e.id} value={e.id}>{e.subject}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1.5">Room</label>
            <div className="relative">
              <select value={roomId} onChange={e => setRoomId(e.target.value)} className="form-input pr-8 appearance-none cursor-pointer">
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.building})</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[['Present',present,'text-emerald-400'],['Absent',absent,'text-red-400'],['Unmarked',unmarked,'text-slate-300']].map(([l,v,c]) => (
            <div key={l as string} className="glass-light rounded-2xl p-4 text-center">
              <p className={`text-2xl font-bold font-display ${c}`}>{v}</p>
              <p className="text-xs text-slate-500 mt-0.5">{l}</p>
            </div>
          ))}
        </div>

        {/* Progress */}
        {students.length > 0 && (
          <div className="glass-light rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Attendance Progress</span>
              <span className="font-medium text-white">{present}/{students.length} ({students.length ? Math.round(present/students.length*100) : 0}%)</span>
            </div>
            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${students.length ? (present/students.length)*100 : 0}%` }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scanner */}
          <div className="space-y-4">
            <QRScannerWidget onScan={handleScan} />
            {lastScanned && (
              <div className="glass-light rounded-2xl p-4 flex items-center gap-3 animate-slide-up">
                <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
                <div><p className="text-xs text-slate-500">Last scanned</p><p className="font-mono text-sm text-white font-medium">{lastScanned}</p></div>
              </div>
            )}
          </div>

          {/* Student list */}
          <div className="lg:col-span-2 glass-light rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <Search size={15} className="text-slate-500" />
              <input className="bg-transparent flex-1 text-sm text-slate-300 placeholder-slate-600 outline-none"
                placeholder="Search by name or roll…" value={search} onChange={e => setSearch(e.target.value)} />
              <span className="text-xs text-slate-500">{filtered.length} students</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-3">
                <Loader2 size={20} className="text-brand-400 animate-spin" />
                <p className="text-slate-500 text-sm">Loading students…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Users size={28} className="text-slate-600" />
                <p className="text-slate-500 text-sm">No students found for this room/exam</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto scrollbar-hide">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface-card/90 backdrop-blur">
                    <tr>{['Student','Branch','Seat','Status','Toggle'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] text-slate-500 font-medium border-b border-white/5">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>{filtered.map(st => <StudentRow key={st.id} student={st} onToggle={toggle} />)}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
