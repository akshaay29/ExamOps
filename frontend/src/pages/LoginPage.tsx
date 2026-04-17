import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ShieldCheck, GraduationCap, ClipboardList,
  Eye, EyeOff, ArrowRight, Sparkles, BookOpen, Loader2,
  LayoutGrid, Activity, QrCode, FileText
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../lib/api'
import { WebGLShader } from '../components/WebGLShader'

type Role = 'ADMIN' | 'STUDENT' | 'INVIGILATOR'

// ─── Floating geometric shape ─────────────────────────────────────────────────
function FloatingShape({ size, x, y, color, delay, duration, shape = 'circle' }: {
  size: number; x: string; y: string; color: string
  delay: number; duration: number; shape?: 'circle' | 'square'
}) {
  return (
    <div className="absolute pointer-events-none" style={{
      width: size, height: size, left: x, top: y,
      borderRadius: shape === 'circle' ? '50%' : '20%',
      background: color, opacity: 0.12, filter: 'blur(1px)',
      animation: `float ${duration}s ease-in-out ${delay}s infinite`,
    }} />
  )
}

// ─── Role selector card ───────────────────────────────────────────────────────
function RoleCard({ role, label, icon: Icon, description, active, onClick }: {
  role: Role; label: string; icon: React.ElementType
  description: string; active: boolean; onClick: () => void
}) {
  const glows: Record<Role, string> = {
    ADMIN: 'rgba(59,91,245,0.5)', STUDENT: 'rgba(16,185,129,0.5)', INVIGILATOR: 'rgba(245,158,11,0.5)',
  }
  const iconColors: Record<Role, string> = {
    ADMIN: 'text-brand-400', STUDENT: 'text-emerald-400', INVIGILATOR: 'text-amber-400',
  }
  return (
    <button onClick={onClick} aria-pressed={active} id={`role-${role.toLowerCase()}`}
      className={`role-card rounded-2xl w-full text-center group transition-all duration-300 ${active ? 'active' : ''}`}
      style={active ? { boxShadow: `0 0 0 1.5px ${glows[role].replace('0.5','0.8')}, 0 12px 40px -8px ${glows[role]}` } : {}}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mx-auto transition-all duration-300 group-hover:scale-110 ${active ? 'bg-white/10' : 'bg-white/5'}`}>
        <Icon size={22} className={active ? iconColors[role] : 'text-slate-400'} />
      </div>
      <p className={`font-semibold text-sm mt-1 ${active ? 'text-white' : 'text-slate-300'}`}>{label}</p>
      <p className="text-slate-500 text-xs leading-relaxed">{description}</p>
    </button>
  )
}

// ─── Form components ──────────────────────────────────────────────────────────
function AdminForm() {
  const [form, setForm] = useState({ email: '' })
  const [sending, setSending] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email) return toast.error('Please enter your email')
    setSending(true)
    try {
      await authAPI.magicLink({ email: form.email })
      toast.success('Magic link sent to your email!')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send magic link')
    } finally {
      setSending(false)
    }
  }

  return (
    <form className="space-y-4 animate-slide-up" onSubmit={handleMagicLink}>
      <div>
        <label className="text-xs text-slate-400 font-medium block mb-1.5">Email Address</label>
        <input id="admin-email" type="email" className="form-input" placeholder="admin@college.edu" value={form.email} onChange={set('email')} required />
      </div>
      <div className="glass-light rounded-xl p-2.5 text-[11px] text-slate-500 font-mono">
        Demo: guptaakshay798@gmail.com
      </div>
      <div className="glass-light rounded-xl p-3 flex items-start gap-2.5">
        <Sparkles size={14} className="text-brand-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-400">A secure <span className="text-brand-400 font-medium">magic login link</span> will be sent to your inbox.</p>
      </div>
      <button type="submit" disabled={sending} className="btn-primary flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg,#3b5bf5,#4f46e5)' }}>
        {sending ? <Loader2 size={16} className="animate-spin" /> : <><span>Send Magic Link</span><ArrowRight size={16} /></>}
      </button>
    </form>
  )
}

function StudentForm({ onSubmit, loading }: { onSubmit: (d: Record<string,string>) => void; loading: boolean }) {
  const [step, setStep] = useState<'ROLL' | 'OTP'>('ROLL')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [form, setForm] = useState({ rollNo: '', otp: '' })
  
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSendOtp = async () => {
    if (!form.rollNo) return toast.error('Please enter your roll number')
    setSendingOtp(true)
    try {
      await authAPI.sendOtp({ rollNo: form.rollNo })
      toast.success('OTP sent to your registered email')
      setStep('OTP')
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to send OTP')
    } finally {
      setSendingOtp(false)
    }
  }

  return (
    <form className="space-y-4 animate-slide-up" onSubmit={e => { e.preventDefault(); onSubmit(form) }}>
      {step === 'ROLL' ? (
        <>
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1.5">Roll Number</label>
            <input id="student-roll" type="text" className="form-input" placeholder="e.g. CS2024001" value={form.rollNo} onChange={set('rollNo')} required />
          </div>
          <button type="button" onClick={handleSendOtp} disabled={sendingOtp} className="btn-primary flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
            {sendingOtp ? <Loader2 size={16} className="animate-spin" /> : <><span>Send OTP via Email</span><ArrowRight size={16} /></>}
          </button>
        </>
      ) : (
        <>
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1.5">Enter 6-Digit OTP</label>
            <input id="student-otp" type="text" className="form-input tracking-[0.2em] font-mono text-center" placeholder="• • • • • •" maxLength={6} value={form.otp} onChange={set('otp')} required autoFocus />
            <div className="flex justify-between items-center mt-2">
              <span className="text-[10px] text-slate-500">Sent to your college email</span>
              <button type="button" onClick={() => setStep('ROLL')} className="text-[10px] text-brand-400 hover:underline">Change Roll No</button>
            </div>
          </div>
          
          <div className="glass-light rounded-xl p-3 flex items-start gap-2.5">
            <Sparkles size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-400">Your <span className="text-emerald-400 font-medium">QR-coded hall ticket</span> will be available after seat allocation.</p>
          </div>
          <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Verify OTP & Login</span><ArrowRight size={16} /></>}
          </button>
        </>
      )}
    </form>
  )
}

function InvigilatorForm() {
  const [form, setForm] = useState({ email: '' })
  const [sending, setSending] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email) return toast.error('Please enter your email')
    setSending(true)
    try {
      await authAPI.magicLink({ email: form.email })
      toast.success('Magic link sent to your email!')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send magic link')
    } finally {
      setSending(false)
    }
  }

  return (
    <form className="space-y-4 animate-slide-up" onSubmit={handleMagicLink}>
      <div>
        <label className="text-xs text-slate-400 font-medium block mb-1.5">Email Address</label>
        <input id="inv-email" type="email" className="form-input" placeholder="staff@college.edu" value={form.email} onChange={set('email')} required />
      </div>
      <div className="glass-light rounded-xl p-2.5 text-[11px] text-slate-500 font-mono">
        Demo: ak129gp@gmail.com
      </div>
      <div className="glass-light rounded-xl p-3 flex items-start gap-2.5">
        <ClipboardList size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-400">Scan QR codes or manually mark attendance for your assigned room.</p>
      </div>
      <button type="submit" disabled={sending} className="btn-primary flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
        {sending ? <Loader2 size={16} className="animate-spin" /> : <><span>Send Magic Link</span><ArrowRight size={16} /></>}
      </button>
    </form>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [role, setRole] = useState<Role>('ADMIN')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (data: Record<string, string>) => {
    setLoading(true)
    try {
      const payload = role === 'STUDENT'
        ? { role, rollNo: data.rollNo, otp: data.otp }
        : { role, email: data.email, password: data.password }

      const res = await authAPI.login(payload)
      const { token, user: u } = res.data
      login({ ...u, token, role })
      toast.success(`Welcome, ${u.name}!`)
      const routes: Record<Role, string> = { ADMIN: '/admin', STUDENT: '/student', INVIGILATOR: '/invigilator' }
      navigate(routes[role])
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Login failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const headings: Record<Role, { title: string; sub: string }> = {
    ADMIN:       { title: 'Admin Portal',      sub: 'Manage exams, rooms & allocations' },
    STUDENT:     { title: 'Student Access',    sub: 'View your hall ticket & QR code'  },
    INVIGILATOR: { title: 'Invigilator Login', sub: 'Mark attendance during exams'     },
  }
  const h = headings[role]

  return (
    <div className="min-h-screen flex relative z-0 overflow-hidden bg-transparent">
      <WebGLShader />
      
      {/* Hero panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 w-[52%] relative z-10">
        <FloatingShape size={320} x="10%" y="-10%" color="rgba(59,91,245,0.6)" delay={0} duration={7} />
        <FloatingShape size={240} x="55%" y="30%" color="rgba(124,58,237,0.5)" delay={2} duration={9} />
        <FloatingShape size={180} x="5%"  y="55%" color="rgba(16,185,129,0.4)" delay={1} duration={8} shape="square" />
        <FloatingShape size={120} x="70%" y="70%" color="rgba(245,158,11,0.5)" delay={3} duration={6} />
        <FloatingShape size={90}  x="40%" y="10%" color="rgba(59,91,245,0.5)"  delay={4} duration={10} shape="square" />
        <FloatingShape size={200} x="65%" y="-5%" color="rgba(167,139,250,0.35)" delay={1.5} duration={8} />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600/30 border border-brand-500/30 flex items-center justify-center">
            <BookOpen size={20} className="text-brand-400" />
          </div>
          <span className="font-display text-xl font-bold text-white tracking-tight">ExamOps</span>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <div className="chip bg-brand-600/20 text-brand-300 border border-brand-500/30 w-fit">
              <Sparkles size={11} />Smart Exam Management System
            </div>
            <h1 className="font-display text-5xl font-bold text-white leading-[1.1]">
              Exams run<br /><span className="text-gradient">on autopilot.</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
              Intelligent seat allocation, QR-based attendance, and real-time reporting — all in one platform.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="glass-light rounded-xl p-4 flex flex-col gap-2 border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
                <LayoutGrid size={18} />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Seating Plan</p>
                <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">Automated & Randomized</p>
              </div>
            </div>

            <div className="glass-light rounded-xl p-4 flex flex-col gap-2 border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Activity size={18} />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Live Analytics</p>
                <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">Real-time Attendance Tracking</p>
              </div>
            </div>

            <div className="glass-light rounded-xl p-4 flex flex-col gap-2 border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <QrCode size={18} />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Digital Attendance</p>
                <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">Secure QR-based Verification</p>
              </div>
            </div>

            <div className="glass-light rounded-xl p-4 flex flex-col gap-2 border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <FileText size={18} />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Exam Reports</p>
                <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">Instant PDF & CSV Exports</p>
              </div>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-slate-600 text-xs">© 2026 ExamOps · College Exam Management Platform</p>
      </div>

      {/* Auth panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="absolute top-6 left-6 lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600/30 border border-brand-500/30 flex items-center justify-center">
            <BookOpen size={16} className="text-brand-400" />
          </div>
          <span className="font-display font-bold text-white text-lg">ExamOps</span>
        </div>

        <div className="w-full max-w-md">
          <div className="glass p-8 space-y-7 animate-slide-up">
            <div className="space-y-1 text-center">
              <h2 className="font-display text-2xl font-bold text-white">{h.title}</h2>
              <p className="text-slate-400 text-sm">{h.sub}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <RoleCard role="ADMIN" label="Admin" icon={ShieldCheck} description="Staff & Management" active={role==='ADMIN'} onClick={() => setRole('ADMIN')} />
              <RoleCard role="STUDENT" label="Student" icon={GraduationCap} description="View Hall Ticket" active={role==='STUDENT'} onClick={() => setRole('STUDENT')} />
              <RoleCard role="INVIGILATOR" label="Invigilator" icon={ClipboardList} description="Mark Attendance" active={role==='INVIGILATOR'} onClick={() => setRole('INVIGILATOR')} />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Credentials</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            {role === 'ADMIN'       && <AdminForm />}
            {role === 'STUDENT'     && <StudentForm     onSubmit={handleSubmit} loading={loading} />}
            {role === 'INVIGILATOR' && <InvigilatorForm />}

            <p className="text-center text-xs text-slate-600">
              Having trouble?{' '}
              <a href="https://www.linkedin.com/in/akshaygupta2905/" target="_blank" rel="noopener noreferrer" className="text-brand-400 cursor-pointer hover:underline capitalize">
                Contact Developer
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
