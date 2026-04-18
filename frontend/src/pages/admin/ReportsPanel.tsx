import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'
import { Download, BarChart3, Users, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react'
import { examsAPI, reportsAPI } from '../../lib/api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'

const COLORS = ['#3b5bf5', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 text-xs shadow-xl border border-white/10">
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function ReportsPanel() {
  const [exams, setExams] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    examsAPI.list().then(res => {
      setExams(res.data)
      if (res.data.length > 0) setSelected(res.data[0])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    reportsAPI.attendance(selected.id).then(res => {
      setReport(res.data)
    }).catch(() => setReport(null))
  }, [selected])

  const handleExport = (_room?: string) => {
    if (!selected || !report) { toast.error('No report data to export'); return }

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const s = report.summary

      // ── Header bar ────────────────────────────────────────────────
      doc.setFillColor(30, 41, 59)   // slate-800
      doc.rect(0, 0, pageW, 22, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Exam Attendance Report', 14, 14)

      // ── Exam details ──────────────────────────────────────────────
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(51, 65, 85)   // slate-700
      const examDate = new Date(selected.date).toDateString()
      doc.text(`Subject: ${selected.subject}  (${selected.id})`, 14, 30)
      doc.text(`Date: ${examDate}   Time: ${selected.startTime} – ${selected.endTime}`, 14, 36)
      doc.text(`Branches: ${selected.branches?.join(', ') ?? '—'}`, 14, 42)

      // ── Summary pills ─────────────────────────────────────────────
      const pills = [
        { label: 'Total',    value: s.total,    color: [59, 91, 245] as [number,number,number] },
        { label: 'Present',  value: s.present,  color: [16, 185, 129] as [number,number,number] },
        { label: 'Absent',   value: s.absent,   color: [239, 68, 68] as [number,number,number] },
        { label: 'Unmarked', value: s.unmarked, color: [107, 114, 128] as [number,number,number] },
      ]
      const pillW = 38, pillH = 14, pillY = 48, gap = 6
      pills.forEach((p, i) => {
        const x = 14 + i * (pillW + gap)
        doc.setFillColor(...p.color)
        doc.roundedRect(x, pillY, pillW, pillH, 3, 3, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text(String(p.value), x + pillW / 2, pillY + 5.5, { align: 'center' })
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.text(p.label, x + pillW / 2, pillY + 10.5, { align: 'center' })
      })

      // ── Table ─────────────────────────────────────────────────────
      const rows = (report.rows as any[]).map(r => [
        r.rollNo,
        r.name,
        r.branch,
        r.room,
        r.seat,
        r.status,
        r.scannedAt ? new Date(r.scannedAt).toLocaleString() : '—',
      ])

      autoTable(doc, {
        startY: 68,
        head: [['Roll No', 'Name', 'Branch', 'Room', 'Seat', 'Status', 'Scanned At']],
        body: rows,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 28, font: 'courier' },
          1: { cellWidth: 45 },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 22 },
          4: { cellWidth: 16, halign: 'center' },
          5: { cellWidth: 22, halign: 'center' },
          6: { cellWidth: 36 },
        },
        didDrawCell: (data) => {
          // Colour the Status column cells
          if (data.section === 'body' && data.column.index === 5) {
            const val = data.cell.raw as string
            if (val === 'PRESENT') {
              doc.setTextColor(5, 150, 105)   // emerald-600
            } else if (val === 'ABSENT') {
              doc.setTextColor(220, 38, 38)   // red-600
            } else {
              doc.setTextColor(107, 114, 128) // slate-500
            }
            doc.setFontSize(8)
            doc.setFont('helvetica', 'bold')
            doc.text(
              val,
              data.cell.x + data.cell.width / 2,
              data.cell.y + data.cell.height / 2 + 1,
              { align: 'center' }
            )
          }
        },
        // Footer with page numbers
        didDrawPage: (data) => {
          const pageCount = (doc as any).internal.getNumberOfPages()
          doc.setFontSize(7)
          doc.setTextColor(150)
          doc.text(
            `Page ${data.pageNumber} of ${pageCount}  ·  Generated ${new Date().toLocaleString()}`,
            pageW / 2, doc.internal.pageSize.getHeight() - 6,
            { align: 'center' }
          )
        },
      })

      const safeName = selected.subject.replace(/[^a-z0-9]/gi, '_')
      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = `Attendance_${safeName}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(pdfUrl)
      toast.success('PDF report downloaded')
    } catch (e) {
      console.error(e)
      toast.error('Failed to generate PDF')
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Loading reports...</div>
  if (exams.length === 0) return <div className="p-8 text-center text-slate-400">No exams configured yet. Import data and schedule exams first!</div>

  const s = report?.summary || { total: 0, present: 0, absent: 0, unmarked: 0 }
  const percent = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0

  const pieData = [
    { name: 'Present', value: s.present, fill: '#10b981' },
    { name: 'Absent', value: s.absent, fill: '#ef4444' },
    { name: 'Unmarked', value: s.unmarked, fill: '#6b7280' },
  ]

  // Convert branch map
  const branchMap = report?.branchBreakdown || {}
  const branchData = Object.keys(branchMap).map(b => {
    const d = branchMap[b]
    return {
      branch: b,
      total: d.total,
      present: d.present,
      absent: report.rows.filter((r: any) => r.branch === b && r.status === 'ABSENT').length,
      unmarked: report.rows.filter((r: any) => r.branch === b && r.status === 'UNMARKED').length
    }
  })

  // Group by room
  const roomMap: Record<string, any> = {}
  if (report?.rows) {
    for (const r of report.rows) {
      if (!roomMap[r.room]) roomMap[r.room] = { room: r.room, present: 0, absent: 0, unmarked: 0 }
      if (r.status === 'PRESENT') roomMap[r.room].present++
      else if (r.status === 'ABSENT') roomMap[r.room].absent++
      else roomMap[r.room].unmarked++
    }
  }
  const roomData = Object.values(roomMap)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white font-display">Attendance Reports</h2>
          <p className="text-slate-500 text-sm">Post-exam analytics and export</p>
        </div>
        <button
          onClick={() => handleExport()}
          disabled={!selected || !report}
          className="btn-primary w-auto px-4 py-2 flex items-center gap-2 text-sm"
        >
          <FileText size={15} />Export PDF
        </button>
      </div>

      <div className="glass-light rounded-2xl p-4 flex gap-3 flex-wrap">
        {exams.map((e: any) => (
          <button key={e.id} onClick={() => setSelected(e)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
              ${selected?.id === e.id ? 'bg-brand-600/30 text-brand-300 border border-brand-500/40' : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'}`}
          >
            {e.subject}
          </button>
        ))}
      </div>

      {!report && selected && <div className="p-8 text-center text-slate-500 bg-white/5 rounded-2xl border border-white/10">No seat allocations found for {selected.subject} yet. Please run the allocation engine first!</div>}

      {report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Seats', value: s.total, icon: Users, color: 'bg-brand-700' },
              { label: 'Present', value: s.present, icon: CheckCircle2, color: 'bg-emerald-700' },
              { label: 'Absent', value: s.absent, icon: XCircle, color: 'bg-red-700' },
              { label: 'Unmarked', value: s.unmarked, icon: Clock, color: 'bg-slate-700' },
            ].map(st => (
              <div key={st.label} className="glass-light rounded-2xl p-4 flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-xs mb-1">{st.label}</p>
                  <p className="text-2xl font-bold text-white font-display">{st.value}</p>
                </div>
                <div className={`w-9 h-9 rounded-xl ${st.color} flex items-center justify-center`}><st.icon size={17} className="text-white" /></div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-light rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 size={16} className="text-brand-400" />
                <h3 className="font-semibold text-white text-sm">Attendance by Branch</h3>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={branchData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="branch" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="unmarked" name="Unmarked" fill="#6b7280" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-light rounded-2xl p-5">
              <h3 className="font-semibold text-white text-sm mb-1">{selected.subject}</h3>
              <p className="text-slate-500 text-xs mb-4">{new Date(selected.date).toDateString()} · {percent}% attendance</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Legend formatter={(val) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{val}</span>} />
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-center text-2xl font-bold text-white font-display -mt-2">{percent}%</p>
              <p className="text-center text-xs text-slate-500">Attendance rate</p>
            </div>
          </div>

          <div className="glass-light rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/5"><h3 className="font-semibold text-white text-sm">Room-wise Summary</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Room', 'Present', 'Absent', 'Unmarked', 'Rate', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs text-slate-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {roomData.map(r => {
                    const t = r.present + r.absent + r.unmarked
                    const rt = Math.round((r.present / (t || 1)) * 100)
                    return (
                      <tr key={r.room} className="hover:bg-white/3 transition-colors">
                        <td className="px-5 py-3.5 text-slate-200 font-medium text-sm">{r.room}</td>
                        <td className="px-5 py-3.5 text-emerald-400 font-mono">{r.present}</td>
                        <td className="px-5 py-3.5 text-red-400 font-mono">{r.absent}</td>
                        <td className="px-5 py-3.5 text-slate-500 font-mono">{r.unmarked}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden w-16">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rt}%` }} />
                            </div>
                            <span className="text-xs text-slate-400">{rt}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <button onClick={() => handleExport(r.room)} className="flex items-center gap-1 chip bg-brand-600/20 text-brand-300 border border-brand-500/20 text-[10px] hover:bg-brand-600/30 cursor-pointer">
                            <Download size={10} />Export
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
