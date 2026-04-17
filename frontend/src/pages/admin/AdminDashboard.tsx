import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Building2, Users, BookOpen, Grid3X3,
  BarChart3, Upload, Plus, Settings, LogOut, ChevronRight,
  FileSpreadsheet, Zap, CheckCircle2, AlertCircle, X, Loader2,
  TableProperties, Edit3, Trash2, RefreshCw, Download
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { roomsAPI, studentsAPI, examsAPI, allocationAPI, reportsAPI } from '../../lib/api'
import ReportsPanel from './ReportsPanel'

// ── Types ──────────────────────────────────────────────────────────────────────
type NavId = 'dashboard' | 'rooms' | 'students' | 'subjects' | 'allocation' | 'reports'

const NAV: { id: NavId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard',  label: 'Dashboard',        icon: LayoutDashboard },
  { id: 'rooms',      label: 'Room Management',  icon: Building2       },
  { id: 'students',   label: 'Students',         icon: Users           },
  { id: 'subjects',   label: 'Subjects & Exams', icon: BookOpen        },
  { id: 'allocation', label: 'Seat Allocation',  icon: Grid3X3         },
  { id: 'reports',    label: 'Reports',          icon: BarChart3       },
]

// ── Shared ─────────────────────────────────────────────────────────────────────
function CsvDropzone({ label, hint, onFile, id }: {
  label: string; hint: string; onFile: (f: File) => void; id: string
}) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const onDrop = useCallback((files: File[]) => {
    if (!files[0]) return
    setFileName(files[0].name); setStatus('loading')
    setTimeout(() => { setStatus('done'); onFile(files[0]) }, 900)
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'text/csv': ['.csv'] }, maxFiles: 1,
  })

  return (
    <div>
      <label className="text-xs text-slate-400 font-medium block mb-2">{label}</label>
      <div {...getRootProps()} id={id}
        className={`dropzone rounded-2xl text-center cursor-pointer ${isDragActive ? 'drag-over' : ''}`}>
        <input {...getInputProps()} />
        {status === 'done' ? (
          <div className="flex items-center gap-3 justify-center">
            <CheckCircle2 size={20} className="text-emerald-400" />
            <p className="text-sm text-emerald-400 font-medium">{fileName}</p>
            <button onClick={e => { e.stopPropagation(); setStatus('idle'); setFileName(null) }} className="text-slate-500 hover:text-slate-300"><X size={14}/></button>
          </div>
        ) : (
          <>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${isDragActive ? 'bg-brand-600/30' : 'bg-white/5'}`}>
              {status === 'loading' ? <Loader2 size={22} className="text-brand-400 animate-spin" /> : <Upload size={22} className={isDragActive ? 'text-brand-400' : 'text-slate-500'} />}
            </div>
            <p className="text-sm text-slate-300 font-medium">{status === 'loading' ? 'Parsing CSV…' : isDragActive ? 'Drop it!' : 'Drag & drop or click'}</p>
            <p className="text-xs text-slate-500">{hint}</p>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, delta, color }: {
  label: string; value: string|number; icon: React.ElementType; delta?: string; color: string
}) {
  return (
    <div className="glass-light rounded-2xl p-5 flex items-start justify-between">
      <div>
        <p className="text-slate-500 text-xs font-medium mb-1.5">{label}</p>
        <p className="text-2xl font-bold text-white font-display">{value}</p>
        {delta && <p className="text-xs text-emerald-400 mt-1 font-medium">{delta}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={19} className="text-white" />
      </div>
    </div>
  )
}

// ── Seat grid with capacity config ─────────────────────────────────────────────
function SeatCapacityGrid({ grid, setGrid }: { grid: number[][]; setGrid: React.Dispatch<React.SetStateAction<number[][]>> }) {
  const toggle = (r: number, c: number) =>
    setGrid(g => { const ng = g.map(row => [...row]); (ng[r]!)[c] = (((ng[r]!)[c]!) + 1) % 3; return ng })

  const colorMap: Record<number, string> = {
    0: 'bg-red-500/20 border-red-500/40 text-red-400',
    1: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
    2: 'bg-brand-600/20 border-brand-500/40 text-brand-400',
  }
  const labelMap: Record<number, string> = { 0: '✕', 1: '1', 2: '2' }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">Click seats to set capacity · Cycle: 1→2→broken</span>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/40 inline-block" /> Broken</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/40 inline-block" /> 1 student</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-500/40 inline-block" /> 2 students</span>
        </div>
      </div>
      <div className="overflow-auto max-h-64 scrollbar-hide">
        <div className="inline-block space-y-1">
          {grid.map((row, r) => (
            <div key={r} className="flex gap-1">
              <span className="w-6 text-center text-xs text-slate-600 self-center">{r + 1}</span>
              {row.map((cap, c) => (
                <button key={c} onClick={() => toggle(r, c)}
                  className={`w-9 h-9 rounded-lg border text-xs font-bold transition-all duration-150 hover:scale-110 ${colorMap[cap]}`}>
                  {labelMap[cap]}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive }: { active: NavId; setActive: (id: NavId) => void }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  return (
    <aside className="w-64 min-h-screen bg-surface-card border-r border-surface-border flex flex-col shrink-0">
      <div className="p-6 border-b border-surface-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-600/30 border border-brand-500/30 flex items-center justify-center">
          <BookOpen size={18} className="text-brand-400" />
        </div>
        <span className="font-display text-lg font-bold text-white">ExamOps</span>
        <span className="chip bg-brand-600/20 text-brand-400 text-[10px] border border-brand-500/30 ml-auto">Admin</span>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {NAV.map(item => (
          <button key={item.id} onClick={() => setActive(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
              ${active === item.id ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
            <item.icon size={17} />{item.label}
            {active === item.id && <ChevronRight size={14} className="ml-auto" />}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-surface-border space-y-1">

        <button onClick={() => { logout(); navigate('/login') }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut size={17}/>Sign Out
        </button>
      </div>
    </aside>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
function DashboardPanel({ setActive }: { setActive: (id: NavId) => void }) {
  const [stats, setStats] = useState({ totalStudents: 0, totalRooms: 0, totalExams: 0, totalAllocations: 0, upcomingExams: [] as any[] })

  useEffect(() => {
    reportsAPI.dashboard().then(r => setStats(r.data)).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white font-display">Dashboard</h2>
        <p className="text-slate-500 text-sm">Overview of upcoming exams and system status</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students"  value={stats.totalStudents}   icon={Users}     color="bg-brand-700"   />
        <StatCard label="Exam Rooms"       value={stats.totalRooms}      icon={Building2} color="bg-purple-700"  />
        <StatCard label="Total Exams"      value={stats.totalExams}       icon={BookOpen}  color="bg-emerald-700" />
        <StatCard label="Allocated Seats"  value={stats.totalAllocations} icon={Grid3X3}   color="bg-amber-700"   />
      </div>

      <div className="glass-light rounded-2xl p-6">
        <h3 className="font-semibold text-white text-sm mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([['Upload Students',Users,'students'],['Add Room',Building2,'rooms'],['Create Exam',BookOpen,'subjects'],['Run Allocation',Zap,'allocation']] as const).map(([label, Icon, action]) => (
            <button key={label} onClick={() => setActive(action as NavId)}
              className="glass-light rounded-xl p-4 flex flex-col items-center gap-2 text-xs font-medium text-slate-300 hover:bg-brand-600/15 hover:border-brand-500/30 hover:text-brand-300 transition-all group">
              <Icon size={20} className="text-slate-500 group-hover:text-brand-400 transition-colors" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {stats.upcomingExams.length > 0 && (
        <div className="glass-light rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/5"><h3 className="font-semibold text-white text-sm">Upcoming Exams</h3></div>
          <div className="divide-y divide-white/5">
            {stats.upcomingExams.map((e: any) => (
              <div key={e.id} className="px-5 py-4 flex items-center justify-between hover:bg-white/3 transition-colors">
                <div>
                  <p className="text-slate-200 font-medium text-sm">{e.subject}</p>
                  <p className="text-xs text-slate-500">{new Date(e.date).toDateString()} · {e.startTime} – {e.endTime}</p>
                </div>
                <div className="flex items-center gap-2">
                  {e.branches?.map((b: string) => (
                    <span key={b} className="chip bg-brand-600/20 text-brand-300 border border-brand-500/20 text-[10px]">{b}</span>
                  ))}
                  <button onClick={() => setActive('allocation')}
                    className="chip bg-brand-600/20 text-brand-300 border border-brand-500/30 text-[11px] hover:bg-brand-600/40 cursor-pointer">
                    <Zap size={10}/>Allocate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Rooms Panel ────────────────────────────────────────────────────────────────
function RoomsPanel() {
  const [rooms,    setRooms]    = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [rows,     setRows]     = useState(5)
  const [cols,     setCols]     = useState(6)
  const [grid,     setGrid]     = useState<number[][]>(() => Array.from({ length: 5 }, () => Array(6).fill(1)))
  const [form,     setForm]     = useState({ name: '', building: '' })
  const [loading,  setLoading]  = useState(false)
  const [viewingRoomId, setViewingRoomId] = useState<string | null>(null)

  // Re-initialize grid when dimensions change
  useEffect(() => {
    setGrid(g => {
      const ng = Array.from({ length: rows }, () => Array(cols).fill(1))
      for (let r = 0; r < Math.min(rows, g.length); r++) {
        for (let c = 0; c < Math.min(cols, g[r].length); c++) ng[r][c] = g[r][c]
      }
      return ng
    })
  }, [rows, cols])

  const fetchRooms = () => roomsAPI.list().then(r => setRooms(r.data)).catch(() => {})
  useEffect(() => { fetchRooms() }, [])

  const handleCsvUpload = async (file: File) => {
    try {
      const res = await roomsAPI.upload(file)
      toast.success(`${res.data.created} rooms imported, ${res.data.skipped} skipped`)
      fetchRooms()
    } catch { toast.error('Room upload failed') }
  }

  const handleCreate = async () => {
    if (!form.name || !form.building) { toast.error('Room name and building required'); return }
    setLoading(true)
    let totalCap = 0
    let layoutData: any = []
    
    // Parse grid layout correctly, count actual capacities
    grid.forEach((r, rowIdx) => r.forEach((cap, colIdx) => {
      totalCap += cap;
      if (cap !== 1) layoutData.push({ row: rowIdx, col: colIdx, cap })
    }))

    try {
      await roomsAPI.create({ name: form.name, building: form.building, rows, seatsPerRow: cols, layout: layoutData, capacity: totalCap })
      toast.success('Room created!')
      setShowForm(false); setShowGrid(false); fetchRooms()
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed to create room') }
    finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    await roomsAPI.delete(id); toast.success('Room deleted'); fetchRooms()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-white font-display">Room Management</h2><p className="text-slate-500 text-sm">Configure exam halls and seat capacities</p></div>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary w-auto px-4 py-2 flex items-center gap-2 text-sm"><Plus size={16}/>{showForm?'Cancel':'Add Room'}</button>
      </div>

      <div className="glass-light rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4"><Building2 size={18} className="text-brand-400"/><h3 className="font-semibold text-white text-sm">Import Room Infrastructure via CSV</h3></div>
        <CsvDropzone id="rooms-csv" label="Room Infrastructure CSV" hint="Columns: room_no, floor, total_tables, rows, cols" onFile={handleCsvUpload} />
        <a href="data:text/csv;charset=utf-8,room_no,floor,total_tables,rows,cols%0ADT-101,1,75,15,5" download="room_template.csv" className="text-xs text-brand-400 hover:underline flex items-center gap-1 mt-3"><FileSpreadsheet size={12}/>Download room template CSV</a>
      </div>

      {showForm && (
        <div className="glass-light rounded-2xl p-6 space-y-5 animate-slide-up">
          <h3 className="font-semibold text-white text-sm">Configure New Room</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">Room Name</label>
              <input className="form-input" placeholder="e.g. Room 301" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">Building / Block</label>
              <input className="form-input" placeholder="e.g. Block C" value={form.building} onChange={e => setForm(f => ({...f, building: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">Rows <span className="text-brand-400 font-bold">{rows}</span></label>
              <input type="range" min={1} max={20} value={rows} onChange={e => setRows(+e.target.value)} className="w-full accent-brand-500 cursor-pointer" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">Seats/Row <span className="text-brand-400 font-bold">{cols}</span></label>
              <input type="range" min={1} max={20} value={cols} onChange={e => setCols(+e.target.value)} className="w-full accent-brand-500 cursor-pointer" />
            </div>
          </div>
          <div className="p-3 rounded-xl bg-brand-600/10 border border-brand-500/20 flex justify-between items-center">
            <span className="text-xs text-slate-400">Total Capacity:</span>
            <span className="font-bold text-brand-300 font-display">{rows * cols} seats</span>
          </div>
          <div>
            <button onClick={() => setShowGrid(s => !s)} className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 font-medium">
              <TableProperties size={15}/>{showGrid ? 'Hide' : 'Configure seat capacities'} (broken / 1 / 2 students)
            </button>
            {showGrid && <div className="mt-4 p-4 glass-light rounded-2xl animate-slide-up"><SeatCapacityGrid grid={grid} setGrid={setGrid} /></div>}
          </div>
          <button onClick={handleCreate} disabled={loading} className="btn-primary w-auto px-6 py-2.5 flex items-center gap-2 text-sm">
            {loading ? <Loader2 size={15} className="animate-spin"/> : <><CheckCircle2 size={15}/>Save Room</>}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rooms.map(r => (
          <div key={r.id} className="glass-light rounded-2xl p-5 space-y-3 hover:border-brand-500/30 transition-all">
            <div className="flex items-start justify-between">
              <div><p className="font-semibold text-white text-sm">{r.name}</p><p className="text-xs text-slate-500">{r.building}</p></div>
              <span className="chip bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">Active</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['Rows',r.rows],['Cols',r.seatsPerRow],['Total',r.capacity]].map(([l,v]) => (
                <div key={l as string} className="bg-white/4 rounded-xl py-2">
                  <p className="text-white font-bold text-base font-display">{v}</p>
                  <p className="text-slate-500 text-[10px]">{l}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setViewingRoomId(r.id === viewingRoomId ? null : r.id)} className="flex-1 btn-secondary py-1.5 text-xs flex items-center justify-center gap-1"><Grid3X3 size={12}/>{viewingRoomId === r.id ? 'Hide Grid' : 'View Grid'}</button>
              <button onClick={() => handleDelete(r.id)} className="flex-1 btn-secondary py-1.5 text-xs flex items-center justify-center gap-1 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"><Trash2 size={12}/>Delete</button>
            </div>
            {viewingRoomId === r.id && (
              <div className="pt-3 border-t border-white/10 animate-slide-up">
                <p className="text-[10px] text-slate-500 mb-2 text-center">Room Layout: {r.rows} rows × {r.seatsPerRow} cols</p>
                <div className="overflow-auto max-h-48 scrollbar-hide text-center space-y-1 pb-1">
                   {Array.from({length: r.rows}).map((_, ri) => (
                     <div key={ri} className="flex justify-center gap-1">
                       {Array.from({length: r.seatsPerRow}).map((_, ci) => (
                         <div key={ci} className="min-w-[20px] w-5 h-5 rounded border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/30 transition-colors text-[8px] font-bold text-emerald-400 flex items-center justify-center">{(ri*r.seatsPerRow)+ci+1}</div>
                       ))}
                     </div>
                   ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Students Panel ─────────────────────────────────────────────────────────────
function StudentsPanel() {
  const [students, setStudents] = useState<any[]>([])
  const [loading,  setLoading]  = useState(false)

  const fetchStudents = () => {
    setLoading(true)
    studentsAPI.list().then(r => setStudents(r.data)).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { fetchStudents() }, [])

  const handleCsvUpload = async (file: File) => {
    try {
      const res = await studentsAPI.upload(file)
      const { created, skipped, errors } = res.data
      toast.success(`${created} students imported, ${skipped} skipped`)
      if (errors?.length) toast(`${errors.length} row(s) had errors`, { icon: '⚠️' })
      fetchStudents()
    } catch { toast.error('Upload failed') }
  }

  const handleDeleteAll = async () => {
    if (!window.confirm("Are you sure you want to delete ALL students? This cannot be undone.")) return
    setLoading(true)
    try {
      await studentsAPI.deleteAll()
      toast.success('All students deleted')
      fetchStudents()
    } catch { toast.error('Failed to delete students') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-white font-display">Student Management</h2><p className="text-slate-500 text-sm">Upload or manage student records</p></div>
        <button onClick={fetchStudents} className="btn-secondary w-auto px-4 py-2 flex items-center gap-2 text-sm"><RefreshCw size={15}/>Refresh</button>
      </div>

      <div className="glass-light rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1"><FileSpreadsheet size={18} className="text-brand-400"/><h3 className="font-semibold text-white text-sm">Bulk Import via CSV</h3></div>
        <CsvDropzone id="students-csv" label="Student List CSV" hint="Columns: rollno, nameid, branch, email" onFile={handleCsvUpload} />
        <a href="data:text/csv;charset=utf-8,rollno,nameid,branch,email%0A2026CS1001,John Doe,CS,student1@college.edu" download="students_template.csv" className="text-xs text-brand-400 hover:underline flex items-center gap-1"><FileSpreadsheet size={12}/>Download student template CSV</a>
      </div>

      <div className="glass-light rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">All Students ({students.length})</h3>
          <div className="flex items-center gap-3">
            {students.length > 0 && (
              <button onClick={handleDeleteAll} className="btn-secondary px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 hover:border-red-500/30 flex items-center gap-1 hover:text-red-300">
                <Trash2 size={12}/>Delete All
              </button>
            )}
            <div className="chip bg-brand-600/20 text-brand-300 border border-brand-500/20 text-xs">{loading ? 'Loading…' : `${students.length} total`}</div>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96 scrollbar-hide">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3"><Loader2 size={20} className="text-brand-400 animate-spin"/><p className="text-slate-500 text-sm">Loading…</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/5">
                {['Roll No','Name','Branch','Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs text-slate-500 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-white/5">
                {students.slice(0,50).map((s: any) => (
                  <tr key={s.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-brand-400">{s.rollNo}</td>
                    <td className="px-5 py-3.5 text-slate-200 font-medium">{s.user?.name || s.rollNo}</td>
                    <td className="px-5 py-3.5"><span className="chip bg-brand-600/20 text-brand-300 border border-brand-500/20 text-[11px]">{s.branch}</span></td>
                    <td className="px-5 py-3.5">
                      <button onClick={async () => { await studentsAPI.delete(s.id); fetchStudents() }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"><Trash2 size={13}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Subjects Panel ─────────────────────────────────────────────────────────────
function SubjectsPanel() {
  const [exams, setExams] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ id: '', subject: '', date: '', startTime: '', endTime: '', branches: '' })
  const [loading, setLoading] = useState(false)

  const fetchExams = () => examsAPI.list().then(r => setExams(r.data)).catch(() => {})
  useEffect(() => { fetchExams() }, [])

  const handleCreate = async () => {
    const branches = form.branches.split(',').map(b => b.trim()).filter(Boolean)
    if (!form.id || !form.subject || !form.date || !form.startTime || !form.endTime || !branches.length) {
      toast.error('All fields required'); return
    }
    setLoading(true)
    try {
      await examsAPI.create({ ...form, branches })
      toast.success('Exam created!'); setShowForm(false); fetchExams()
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-white font-display">Subjects & Exams</h2><p className="text-slate-500 text-sm">Manage exam schedules and branches</p></div>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary w-auto px-4 py-2 flex items-center gap-2 text-sm"><Plus size={16}/>{showForm?'Cancel':'Create Exam'}</button>
      </div>

      {showForm && (
        <div className="glass-light rounded-2xl p-6 space-y-4 animate-slide-up">
          <h3 className="font-semibold text-white text-sm">New Exam</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Subject Code</label><input className="form-input" placeholder="CS302" value={form.id} onChange={e => setForm(f=>({...f,id:e.target.value}))}/></div>
            <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Subject Name</label><input className="form-input" placeholder="Data Structures" value={form.subject} onChange={e => setForm(f=>({...f,subject:e.target.value}))}/></div>
            <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Exam Date</label><input type="date" className="form-input" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))}/></div>
            <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Branches (comma-separated)</label><input className="form-input" placeholder="CS, IT, ME" value={form.branches} onChange={e => setForm(f=>({...f,branches:e.target.value}))}/></div>
            <div><label className="text-xs text-slate-400 font-medium block mb-1.5">Start Time</label><input type="time" className="form-input" value={form.startTime} onChange={e => setForm(f=>({...f,startTime:e.target.value}))}/></div>
            <div><label className="text-xs text-slate-400 font-medium block mb-1.5">End Time</label><input type="time" className="form-input" value={form.endTime} onChange={e => setForm(f=>({...f,endTime:e.target.value}))}/></div>
          </div>
          <button onClick={handleCreate} disabled={loading} className="btn-primary w-auto px-6 py-2.5 flex items-center gap-2 text-sm">
            {loading ? <Loader2 size={15} className="animate-spin"/> : <><CheckCircle2 size={15}/>Save Exam</>}
          </button>
        </div>
      )}

      <div className="glass-light rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5"><h3 className="font-semibold text-white text-sm">Scheduled Exams ({exams.length})</h3></div>
        <div className="divide-y divide-white/5">
          {exams.map((e: any) => (
            <div key={e.id} className="px-5 py-4 flex items-center justify-between hover:bg-white/3 transition-colors">
              <div className="space-y-1">
                <p className="text-slate-200 font-medium text-sm">{e.subject}</p>
                <div className="flex items-center gap-2">
                  {e.branches?.map((b: string) => (
                    <span key={b} className="chip bg-brand-600/20 text-brand-300 border border-brand-500/20 text-[10px]">{b}</span>
                  ))}
                  <span className="text-slate-500 text-xs">{new Date(e.date).toDateString()} · {e.startTime}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={async () => { await examsAPI.delete(e.id); fetchExams() }}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"><Trash2 size={13}/></button>
              </div>
            </div>
          ))}
          {exams.length === 0 && <p className="text-center text-slate-500 py-8 text-sm">No exams scheduled yet.</p>}
        </div>
      </div>
    </div>
  )
}

// ── Branch colour palette (extended) ──────────────────────────────────────────
const BRANCH_PALETTE: Record<string, { bg: string; border: string; ring: string }> = {
  CS:  { bg: 'bg-blue-600/60',    border: 'border-blue-500/50',    ring: 'ring-blue-400'    },
  IT:  { bg: 'bg-purple-600/55',  border: 'border-purple-500/50',  ring: 'ring-purple-400'  },
  CE:  { bg: 'bg-amber-700/60',   border: 'border-amber-600/50',   ring: 'ring-amber-400'   },
  ME:  { bg: 'bg-emerald-600/55', border: 'border-emerald-500/50', ring: 'ring-emerald-400' },
  EC:  { bg: 'bg-rose-600/55',    border: 'border-rose-500/50',    ring: 'ring-rose-400'    },
  EE:  { bg: 'bg-pink-600/55',    border: 'border-pink-500/50',    ring: 'ring-pink-400'    },
  CH:  { bg: 'bg-teal-600/55',    border: 'border-teal-500/50',    ring: 'ring-teal-400'    },
  BT:  { bg: 'bg-lime-600/55',    border: 'border-lime-500/50',    ring: 'ring-lime-400'    },
  MCA: { bg: 'bg-indigo-600/55',  border: 'border-indigo-500/50',  ring: 'ring-indigo-400'  },
}
const FALLBACK_PALETTE = [
  { bg: 'bg-cyan-600/55',    border: 'border-cyan-500/50',    ring: 'ring-cyan-400'    },
  { bg: 'bg-orange-600/55',  border: 'border-orange-500/50',  ring: 'ring-orange-400'  },
  { bg: 'bg-violet-600/55',  border: 'border-violet-500/50',  ring: 'ring-violet-400'  },
  { bg: 'bg-sky-600/55',     border: 'border-sky-500/50',     ring: 'ring-sky-400'     },
  { bg: 'bg-fuchsia-600/55', border: 'border-fuchsia-500/50', ring: 'ring-fuchsia-400' },
]
function getBranchStyle(branch: string, allBranches: string[]) {
  if (BRANCH_PALETTE[branch]) return BRANCH_PALETTE[branch]
  const idx = allBranches.indexOf(branch)
  return FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length]!
}

// ── SeatGrid – pure display component ─────────────────────────────────────────
function SeatGrid({ gridData }: { gridData: any }) {
  const branches: string[] = gridData.branchesPresent ?? []
  const grid: (any[])[][] = gridData.grid

  return (
    <div className="space-y-4">
      {/* Live legend – only branches actually present */}
      {branches.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-white/3 rounded-xl border border-white/8">
          {branches.map(b => {
            const s = getBranchStyle(b, branches)
            return (
              <span key={b} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${s.bg} ${s.border} border text-xs text-white font-semibold`}>
                {b}
              </span>
            )
          })}
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-500">
            Empty
          </span>
        </div>
      )}

      {/* Exams on this date */}
      {gridData.exams?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {gridData.exams.map((e: any) => (
            <div key={e.id} className="px-3 py-1.5 rounded-lg bg-brand-600/15 border border-brand-500/25 text-xs">
              <span className="text-brand-300 font-semibold">{e.subject}</span>
              <span className="text-slate-500 ml-2">{e.startTime} · {e.branches?.join(', ')}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500">
        {gridData.room.name} · {gridData.room.rows} rows × {gridData.room.cols} cols
        <span className="ml-3 font-semibold text-brand-400">{gridData.totalAllocated} students seated</span>
      </p>

      {/* Grid render */}
      <div className="overflow-auto max-h-[440px] scrollbar-hide">
        <div className="inline-block space-y-1 pb-2">
          {/* Column header row */}
          <div className="flex gap-1">
            <span className="w-7" />
            {Array.from({ length: gridData.room.cols }, (_, c) => (
              <span key={c} className="w-10 text-center text-[9px] text-slate-600 font-medium">{c + 1}</span>
            ))}
          </div>
          {grid.map((row, r) => (
            <div key={r} className="flex gap-1 items-center">
              <span className="w-7 text-[10px] text-slate-600 font-medium text-right pr-1">{r + 1}</span>
              {row.map((cellArr: any[], c: number) => {
                const isEmpty = !cellArr || cellArr.length === 0
                return (
                  <div key={c}
                    className={`w-10 rounded-lg border flex flex-col overflow-hidden transition-all duration-150
                      ${isEmpty
                        ? 'h-10 border-white/8 bg-white/3'
                        : 'h-10 border-white/15 bg-white/5 hover:scale-110 hover:z-10 cursor-default'
                      }`}>
                    {!isEmpty && cellArr.map((cell: any, idx: number) => {
                      const s = getBranchStyle(cell.branch, branches)
                      return (
                        <div key={idx}
                          title={`${cell.name}\n${cell.rollNo} · ${cell.branch}\nSeat: ${cell.seat}\nExam: ${cell.examId}\nStatus: ${cell.status}`}
                          className={`flex-1 flex items-center justify-center text-[8px] font-bold text-white leading-none relative
                            ${s.bg}
                            ${cell.status === 'PRESENT' ? `ring-1 inset-0 ${s.ring}` : ''}
                            ${cellArr.length > 1 && idx === 0 ? 'border-b border-black/20' : ''}`}>
                          {cell.branch}
                          {cell.status === 'PRESENT' && (
                            <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Allocation Panel ───────────────────────────────────────────────────────────
function AllocationPanel() {
  // ── Run allocation ──
  const [exams,    setExams]    = useState<any[]>([])
  const [selected, setSelected] = useState('')
  const [running,  setRunning]  = useState(false)
  const [result,   setResult]   = useState<any>(null)

  // ── Grid viewer (independent of run result) ──
  const [rooms,       setRooms]       = useState<any[]>([])
  const [gridRoom,    setGridRoom]    = useState('')
  const [gridDate,    setGridDate]    = useState(() => new Date().toISOString().slice(0, 10))
  const [gridData,    setGridData]    = useState<any>(null)
  const [gridLoading, setGridLoading] = useState(false)

  useEffect(() => {
    examsAPI.list().then(r => setExams(r.data)).catch(() => {})
    roomsAPI.list().then(r => setRooms(r.data)).catch(() => {})
  }, [])

  const run = async () => {
    if (!selected) { toast.error('Select an exam first'); return }
    setRunning(true); setResult(null)
    try {
      const res = await allocationAPI.generate(selected)
      setResult(res.data)
      toast.success(`${res.data.placed} seats allocated!`)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Allocation failed')
    } finally { setRunning(false) }
  }

  const loadGrid = async () => {
    if (!gridRoom || !gridDate) { toast.error('Select a room and date'); return }
    setGridLoading(true); setGridData(null)
    try {
      const res = await allocationAPI.gridByDate(gridRoom, gridDate)
      setGridData(res.data)
      if (res.data.totalAllocated === 0)
        toast('No students allocated in this room on that date', { icon: 'ℹ️' })
    } catch { toast.error('Failed to load grid') }
    finally { setGridLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white font-display">Seat Allocation Engine</h2>
        <p className="text-slate-500 text-sm">Run the anti-copy interleaving algorithm</p>
      </div>

      {/* ── Section 1: Run allocation ───────────────────────────────── */}
      <div className="glass-light rounded-2xl p-6 space-y-5">
        <div>
          <label className="text-xs text-slate-400 font-medium block mb-1.5">Select Exam</label>
          <select className="form-input" value={selected} onChange={e => { setSelected(e.target.value); setResult(null) }}>
            <option value="">— Choose an exam —</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.subject} ({e.id}) — {new Date(e.date).toDateString()}</option>)}
          </select>
        </div>
        <div className="p-4 glass-light rounded-xl text-sm text-slate-400 space-y-1.5">
          <p className="font-medium text-slate-300 text-xs">Algorithm: Greedy Anti-Copy Interleaving</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Groups students by branch, picks branch with most remaining at each seat</li>
            <li>Ensures no left or top neighbour shares the same branch code</li>
            <li>Generates unique signed JWT QR token per seat (30 day expiry)</li>
            <li>Incremental: re-running <span className="text-emerald-400">adds only unallocated students</span> — existing data preserved</li>
          </ul>
        </div>
        <button onClick={run} disabled={running} className="btn-primary flex items-center justify-center gap-2">
          {running ? <><Loader2 size={16} className="animate-spin"/>Allocating seats…</> : <><Zap size={16}/>Run Seat Allocation</>}
        </button>
        {result && (
          <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-slide-up">
            <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-emerald-400 text-sm">Allocation complete!</p>
              <p className="text-xs text-emerald-600">{result.placed} students assigned · {result.unplaced} unplaced</p>
              {result.unplaced > 0 && <p className="text-xs text-amber-400 mt-1">⚠ Add more rooms to seat remaining students</p>}
            </div>
          </div>
        )}
      </div>

      {/* ── Section 2: Multi-branch Grid Viewer ────────────────────── */}
      <div className="glass-light rounded-2xl p-6 space-y-5">
        <div>
          <h3 className="font-semibold text-white text-sm mb-0.5 flex items-center gap-2">
            <Grid3X3 size={15} className="text-brand-400"/>Room Grid Viewer
          </h3>
          <p className="text-xs text-slate-500">Shows ALL branches allocated in a room on a given date</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1.5">Room</label>
            <select className="form-input py-2 text-sm" value={gridRoom}
              onChange={e => { setGridRoom(e.target.value); setGridData(null) }}>
              <option value="">— Select room —</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.building})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1.5">Exam Date</label>
            <input type="date" className="form-input py-2 text-sm" value={gridDate}
              onChange={e => { setGridDate(e.target.value); setGridData(null) }} />
          </div>
        </div>

        <button onClick={loadGrid}
          disabled={gridLoading || !gridRoom || !gridDate}
          className="btn-secondary w-auto px-5 py-2 flex items-center gap-2 text-sm">
          {gridLoading
            ? <><Loader2 size={15} className="animate-spin"/>Loading…</>
            : <><Grid3X3 size={15}/>Load Grid</>}
        </button>

        {gridData && gridData.totalAllocated === 0 && (
          <div className="flex items-center gap-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <AlertCircle size={16} className="text-amber-400" />
            <p className="text-xs text-amber-400">No students are allocated in this room on the selected date.</p>
          </div>
        )}

        {gridData && gridData.totalAllocated > 0 && <SeatGrid gridData={gridData} />}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [active, setActive] = useState<NavId>('dashboard')

  const panels: Record<NavId, React.ReactNode> = {
    dashboard:  <DashboardPanel setActive={setActive} />,
    rooms:      <RoomsPanel />,
    students:   <StudentsPanel />,
    subjects:   <SubjectsPanel />,
    allocation: <AllocationPanel />,
    reports:    <ReportsPanel />,
  }

  return (
    <div className="bg-mesh min-h-screen flex">
      <Sidebar active={active} setActive={setActive} />
      <main className="flex-1 p-8 overflow-y-auto scrollbar-hide">
        {panels[active]}
      </main>
    </div>
  )
}
