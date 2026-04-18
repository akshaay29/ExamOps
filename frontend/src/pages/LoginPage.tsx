import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ShieldCheck, GraduationCap, ClipboardList,
  Eye, EyeOff, ArrowRight, Sparkles, BookOpen, Loader2,
  LayoutGrid, Activity, QrCode, FileText, Bug
} from 'lucide-react'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
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
      style={active ? { boxShadow: `0 0 0 1.5px ${glows[role].replace('0.5', '0.8')}, 0 12px 40px -8px ${glows[role]}` } : {}}>
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
      <button type="submit" disabled={sending} className="btn-primary flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg,#3b5bf5,#4f46e5)' }}>
        {sending ? <Loader2 size={16} className="animate-spin" /> : <><span>Login</span><ArrowRight size={16} /></>}
      </button>
    </form>
  )
}

function StudentForm({ onSubmit, loading }: { onSubmit: (d: Record<string, string>) => void; loading: boolean }) {
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
      <button type="submit" disabled={sending} className="btn-primary flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
        {sending ? <Loader2 size={16} className="animate-spin" /> : <><span>Login</span><ArrowRight size={16} /></>}
      </button>
    </form>
  )
}

// ─── Scroll Sections ──────────────────────────────────────────────────────────
const slideUp: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } }
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
}

function HowItWorksSection() {
  const steps = [
    { num: '01', title: 'Upload Data', desc: 'Securely import student and room data via CSV files.' },
    { num: '02', title: 'Auto-Allocation', desc: 'Instantly generates optimized seating charts.' },
    { num: '03', title: 'Digital Verification', desc: 'Generate QR hall tickets and monitor attendance in real-time.' }
  ]

  return (
    <div className="px-6 lg:px-12 max-w-7xl mx-auto border-t border-white/5 pt-16 mt-[-4rem]">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={slideUp} className="text-center mb-16">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-white">How it Works</h2>
        <p className="text-slate-400 max-w-2xl mx-auto">A seamless workflow from setup to execution, designed to save hours of administrative work.</p>
      </motion.div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}
        className="grid md:grid-cols-3 gap-8">
        {steps.map((s, i) => (
          <motion.div key={i} variants={slideUp} className="relative glass-light p-8 rounded-2xl border border-white/10 hover:border-white/20 transition-all bg-black/40 backdrop-blur-sm shadow-xl overflow-hidden">
            <span className="text-[120px] leading-none font-display font-bold text-white/[0.02] absolute -top-6 -right-6 select-none pointer-events-none">{s.num}</span>
            <div className="w-12 h-12 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-lg mb-6 border border-brand-500/30">
              {s.num}
            </div>
            <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
            <p className="text-slate-400 leading-relaxed text-sm">{s.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

const flyInLeft: Variants = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, bounce: 0.2, duration: 0.8, delay: 0.1 } }
}

const flyInRight: Variants = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, bounce: 0.2, duration: 0.8, delay: 0.2 } }
}

function FeaturesSection() {
  const features = [
    { icon: LayoutGrid, title: 'Intelligent Seating Algorithm', desc: 'Our advanced algorithm ensures optimal distance between students of the same course. Customize constraints based on room capacities and exam types.', color: 'text-brand-400', bg: 'bg-brand-500/20' },
    { icon: Activity, title: 'Live Admin Dashboard', desc: 'Monitor the exact status of your exams in real-time. See which rooms are full, track invigilator activity, and handle emergencies centrally.', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    { icon: QrCode, title: 'QR-Powered Entry', desc: 'Eradicate proxy attendance. Students scan their dynamically generated QR codes at the exam hall for instant verification.', color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { icon: FileText, title: 'Comprehensive Reports', desc: 'Generate post-exam compliance reports automatically. Export attendance logs as PDF or CSV in seconds, ready for audits.', color: 'text-rose-400', bg: 'bg-rose-500/20' }
  ]

  return (
    <div className="px-6 lg:px-12 max-w-7xl mx-auto pt-24 border-t border-white/5 mt-16">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={slideUp} className="text-center mb-20">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-white">Features Deep-Dive</h2>
        <p className="text-slate-400 max-w-2xl mx-auto">Everything you need to run large-scale examinations without the logistical nightmare.</p>
      </motion.div>

      <div className="space-y-24">
        {features.map((f, i) => {
          const Icon = f.icon
          const isEven = i % 2 === 0
          const animationVariant = isEven ? flyInLeft : flyInRight

          return (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={animationVariant}
              className={`flex flex-col md:flex-row gap-8 lg:gap-16 items-center ${isEven ? '' : 'md:flex-row-reverse'}`}>

              <div className="flex-1 w-full bg-black/40 backdrop-blur-sm border border-white/5 rounded-[2rem] p-12 flex items-center justify-center glass-light shadow-2xl hover:border-white/10 transition-all">
                <div className={`w-32 h-32 rounded-2xl ${f.bg} flex items-center justify-center shadow-inner`}>
                  <Icon size={64} className={`${f.color} drop-shadow-lg`} />
                </div>
              </div>

              <div className="flex-1 space-y-5 px-4 md:px-8">
                <h3 className="text-2xl md:text-3xl font-bold text-white">{f.title}</h3>
                <p className="text-slate-400 leading-relaxed text-lg">{f.desc}</p>
              </div>

            </motion.div>
          )
        })}
      </div>

      <div className="text-center mt-32 pb-12 flex flex-col items-center gap-4">
        <a 
          href="https://mail.google.com/mail/?view=cm&fs=1&to=guptaakshay798@gmail.com&su=[ExamOps%20Bug%20Report]&body=Please%20describe%20the%20bug%20you%20encountered:%0A%0A1.%20What%20happened?%0A%0A%0A2.%20What%20did%20you%20expect%20to%20happen?%0A%0A"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white px-4 py-2 rounded-full border border-white/5 transition-all"
        >
          <Bug size={14} className="text-rose-400" />
          <span>Report a Bug</span>
        </a>
        <p className="text-slate-600 text-sm">© 2026 ExamOps · Intelligent Institutional Platform</p>
      </div>
    </div>
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

      const res = await authAPI.login(payload as unknown as Record<string, string>)
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
    ADMIN: { title: 'Admin Portal', sub: 'Manage exams, rooms & allocations' },
    STUDENT: { title: 'Student Access', sub: 'View your hall ticket & QR code' },
    INVIGILATOR: { title: 'Invigilator Login', sub: 'Mark attendance during exams' },
  }
  const h = headings[role]

  return (
    <div className="relative z-0 overflow-x-hidden w-full bg-transparent">
      {/* Background shader (fixed) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <WebGLShader />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.8) 100%)' }} />
      </div>

      {/* Hero & Auth panel */}
      <div className="min-h-screen flex relative z-10 w-full mb-16">
        <div className="hidden lg:flex flex-col justify-between p-12 w-[52%] relative z-10">
          <FloatingShape size={320} x="10%" y="-10%" color="rgba(59,91,245,0.6)" delay={0} duration={7} />
          <FloatingShape size={240} x="55%" y="30%" color="rgba(124,58,237,0.5)" delay={2} duration={9} />
          <FloatingShape size={180} x="5%" y="55%" color="rgba(16,185,129,0.4)" delay={1} duration={8} shape="square" />
          <FloatingShape size={120} x="70%" y="70%" color="rgba(245,158,11,0.5)" delay={3} duration={6} />
          <FloatingShape size={90} x="40%" y="10%" color="rgba(59,91,245,0.5)" delay={4} duration={10} shape="square" />
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
              <div className="glass-light rounded-xl p-4 flex flex-col gap-2 border border-white/10 hover:border-white/20 transition-colors backdrop-blur-sm bg-black/40 shadow-xl">
                <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
                  <LayoutGrid size={18} />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm drop-shadow-md">Seating Plan</p>
                  <p className="text-slate-300 text-xs mt-0.5 leading-relaxed drop-shadow-sm">Automated & Randomized</p>
                </div>
              </div>

              <div className="glass-light rounded-xl p-4 flex flex-col gap-2 border border-white/10 hover:border-white/20 transition-colors backdrop-blur-sm bg-black/40 shadow-xl">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Activity size={18} />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm drop-shadow-md">Live Analytics</p>
                  <p className="text-slate-300 text-xs mt-0.5 leading-relaxed drop-shadow-sm">Real-time Attendance Tracking</p>
                </div>
              </div>

              <div className="glass-light rounded-xl p-4 flex flex-col gap-2 border border-white/10 hover:border-white/20 transition-colors backdrop-blur-sm bg-black/40 shadow-xl">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <QrCode size={18} />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm drop-shadow-md">Digital Attendance</p>
                  <p className="text-slate-300 text-xs mt-0.5 leading-relaxed drop-shadow-sm">Secure QR-based Verification</p>
                </div>
              </div>

              <div className="glass-light rounded-xl p-4 flex flex-col gap-2 border border-white/10 hover:border-white/20 transition-colors backdrop-blur-sm bg-black/40 shadow-xl">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm drop-shadow-md">Exam Reports</p>
                  <p className="text-slate-300 text-xs mt-0.5 leading-relaxed drop-shadow-sm">Instant PDF & CSV Exports</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer removed from hero panel, moved to bottom of page */}
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
                <RoleCard role="ADMIN" label="Admin" icon={ShieldCheck} description="Staff & Management" active={role === 'ADMIN'} onClick={() => setRole('ADMIN')} />
                <RoleCard role="STUDENT" label="Student" icon={GraduationCap} description="View Hall Ticket" active={role === 'STUDENT'} onClick={() => setRole('STUDENT')} />
                <RoleCard role="INVIGILATOR" label="Invigilator" icon={ClipboardList} description="Mark Attendance" active={role === 'INVIGILATOR'} onClick={() => setRole('INVIGILATOR')} />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Credentials</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>

              {role === 'ADMIN' && <AdminForm />}
              {role === 'STUDENT' && <StudentForm onSubmit={handleSubmit} loading={loading} />}
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

      {/* New Scrolling Content that fades background into solid dark color */}
      <div className="relative z-10 bg-gradient-to-b from-transparent via-slate-950/90 to-[#020617] pt-24 pb-16">
        <HowItWorksSection />
      </div>
      <div className="relative z-10 bg-[#020617]">
        <FeaturesSection />
      </div>

    </div>
  )
}
