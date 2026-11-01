import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertOctagon, Copy, Check, Send, Clock, AlertTriangle,
  Building2, MapPin, RefreshCw, CheckCircle2,
  Paperclip, X, FileText, Printer, Scale, ArrowRight
} from 'lucide-react'
import { useLang } from '../i18n/strings'
import client, { useMock } from '../api/client'
import VoiceButton from '../components/VoiceButton'
import Disclaimer from '../components/Disclaimer'
import { printPetitionPdf } from '../utils/pdfGenerator'

export default function Complaints() {
  const { lang, t } = useLang()
  const isHi = lang === 'hi'

  // Form inputs
  const [text, setText] = useState('')
  const [location, setLocation] = useState('')
  const [listening, setListening] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copiedDraft, setCopiedDraft] = useState(false)

  // Newly submitted grievance result
  const [registeredComplaint, setRegisteredComplaint] = useState(null)

  // Public complaints tracker state
  const [complaintsList, setComplaintsList] = useState([])
  const [trackerLoading, setTrackerLoading] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('all')

  const fileInputRef = useRef(null)
  const [attachedFile, setAttachedFile] = useState(null)   // { name, size, preview, type }
  const [attachAnim, setAttachAnim] = useState(false)       // triggers pop-in animation

  // Fetch public complaints tracker
  const loadTracker = async () => {
    setTrackerLoading(true)
    try {
      if (useMock) {
        await new Promise((r) => setTimeout(r, 400))
        setComplaintsList([
          {
            id: 'c1a2b3c4-1111-4000-8000-000000000001',
            text: 'Frequent power cuts in Ward 12 affecting students preparing for board exams.',
            category: 'electricity',
            department: 'State Electricity Distribution Company (DISCOM)',
            severity: 'high',
            location: 'Dhanbad, Ward 12',
            status: 'in_progress',
            created_at: '2026-10-10T10:00:00Z',
            formal_draft: 'To the Executive Engineer, DISCOM...\nSubject: Urgent power outages in Ward 12...'
          },
          {
            id: 'c1a2b3c4-2222-4000-8000-000000000002',
            text: 'Open sewer drain overflowing near primary school causing severe mosquito breeding.',
            category: 'sanitation',
            department: 'Municipal Corporation Public Health Department',
            severity: 'high',
            location: 'Ranchi Main Road',
            status: 'received',
            created_at: '2026-10-12T08:30:00Z',
            formal_draft: 'To the Municipal Health Officer...\nSubject: Open sewer drain near primary school...'
          },
          {
            id: 'c1a2b3c4-3333-4000-8000-000000000003',
            text: 'Deep potholes on the main market connecting road creating traffic congestion.',
            category: 'road',
            department: 'Public Works Department (PWD)',
            severity: 'medium',
            location: 'Dhanbad Station Road',
            status: 'resolved',
            created_at: '2026-10-25T11:15:00Z',
            formal_draft: 'To the Executive Engineer, PWD...\nSubject: Road maintenance...'
          }
        ])
      } else {
        const res = await client.get('/complaints')
        setComplaintsList(res.data || [])
      }
    } catch (err) {
      console.error('Failed to load complaints', err)
    } finally {
      setTrackerLoading(false)
    }
  }

  useEffect(() => {
    loadTracker()
  }, [])

  // Handle file selection → show animated preview badge
  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const isImage = f.type.startsWith('image/')
    const preview = isImage ? URL.createObjectURL(f) : null
    setAttachedFile({
      name: f.name,
      size: (f.size / 1024).toFixed(0),
      preview,
      type: f.type
    })
    setAttachAnim(false)
    setTimeout(() => setAttachAnim(true), 10)
  }

  // Remove attached file
  const removeFile = () => {
    if (attachedFile?.preview) URL.revokeObjectURL(attachedFile.preview)
    setAttachedFile(null)
    setAttachAnim(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Handle complaint registration
  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!text.trim() || !location.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
      if (useMock) {
        await new Promise((r) => setTimeout(r, 900))
        const mockResult = {
          id: `c-mock-${Date.now()}`,
          text: text.trim(),
          location: location.trim(),
          category: text.toLowerCase().includes('water') ? 'water' : text.toLowerCase().includes('road') ? 'road' : 'sanitation',
          department: 'Municipal Public Works & Water Supply Board',
          severity: 'high',
          status: 'received',
          created_at: new Date().toISOString(),
          formal_draft: `To the Competent Municipal Authority,\nDepartment of Public Works,\n\nSubject: Formal public grievance regarding urgent issues at ${location}\n\nRespected Sir/Madam,\n\nI wish to bring to your urgent notice that the local public is facing significant hardship due to: ${text}.\n\nThis requires immediate inspection and rectification by your field team to prevent public health hazards and disruption.\n\nRespectfully submitted,\nCitizen of ${location}`,
          duplicates_found: ['c1a2b3c4-1111-4000-8000-000000000001']
        }
        setRegisteredComplaint(mockResult)
        setComplaintsList((prev) => [mockResult, ...prev])
      } else {
        const formData = new FormData()
        formData.append('text', text.trim())
        formData.append('location', location.trim())
        formData.append('lang', lang)
        if (fileInputRef.current?.files?.[0]) {
          formData.append('file', fileInputRef.current.files[0])
        }

        const res = await client.post('/complaints', formData)
        setRegisteredComplaint(res.data)
        loadTracker()
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to submit grievance. Please try again.')
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setAttachedFile(null)
      setAttachAnim(false)
    }
  }

  const handleCopy = (draftText) => {
    navigator.clipboard.writeText(draftText)
    setCopiedDraft(true)
    setTimeout(() => setCopiedDraft(false), 2000)
  }

  // Days open calculation & overdue flag (> 15 days)
  const computeDaysOpen = (createdAtStr) => {
    try {
      const created = new Date(createdAtStr)
      const now = new Date()
      const diffDays = Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)))
      return {
        days: diffDays,
        isOverdue: diffDays > 15
      }
    } catch {
      return { days: 0, isOverdue: false }
    }
  }

  // Filter complaints tracker by category
  const filteredTracker = complaintsList.filter((item) => {
    if (categoryFilter === 'all') return true
    return (item.category || '').toLowerCase() === categoryFilter.toLowerCase()
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10 space-y-8">
      {/* Prominent Prototype Banner */}
      <div
        role="note"
        aria-label="Civic Prototype Warning"
        className="bg-amber-tint border border-amber-warn/40 text-amber-warn rounded-2xl p-4 text-xs font-semibold flex items-center justify-between gap-3 shadow-2xs"
      >
        <div className="flex items-center gap-2.5">
          <AlertOctagon size={18} className="text-amber-warn shrink-0" />
          <span>{t.complaints?.protoBanner || 'Prototype for information only. Not connected to any government portal.'}</span>
        </div>
        <span className="text-[11px] opacity-80 hidden md:inline font-medium">
          Official Administrative Format Generator
        </span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
            {t.complaints?.title || 'Civic Grievance & Complaints'}
          </h1>
          <span className="text-xs px-3 py-1 rounded-full bg-danger-tint text-danger font-bold border border-danger/30">
            Formal Petitions & Escalation
          </span>
        </div>
        <p className="text-xs sm:text-sm text-muted max-w-3xl leading-relaxed">
          {t.complaints?.subtitle}
        </p>
      </div>

      {/* Grievance Submission Form */}
      <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">
              Civic Problem Description
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.complaints?.issuePlaceholder}
                className="w-full text-sm text-navy placeholder:text-muted/70 border border-border rounded-xl p-3.5 focus-visible:outline-3 focus-visible:outline-saffron focus-visible:outline-offset-2 transition-all pr-14 bg-white"
              />
              <div className="absolute right-2.5 bottom-2.5">
                <VoiceButton
                  onResult={(spoken) => setText((p) => p ? `${p} ${spoken}` : spoken)}
                  listening={listening}
                  setListening={setListening}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">
              Location / Ward / Locality
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t.complaints?.locationPlaceholder}
              className="w-full text-sm text-navy placeholder:text-muted/70 border border-border rounded-xl p-3.5 focus-visible:outline-3 focus-visible:outline-saffron focus-visible:outline-offset-2 transition-all bg-white"
            />
            <p className="text-[11px] text-muted pt-0.5">
              Used for duplicate clustering and department routing.
            </p>
          </div>
        </div>

        {/* File upload & Submit row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {!attachedFile && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-navy transition-colors cursor-pointer border border-border"
              >
                <Paperclip size={14} />
                <span>{t.complaints?.photoBtn || 'Attach photo / document'}</span>
              </button>
            )}

            {/* Animated attachment badge with thumbnail */}
            {attachedFile && (
              <div
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border-2 border-emerald-verified bg-emerald-tint shadow-xs text-xs font-semibold text-emerald-verified transition-all duration-300 ${
                  attachAnim ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                }`}
              >
                {attachedFile.preview ? (
                  <img
                    src={attachedFile.preview}
                    alt="attachment preview"
                    className="w-8 h-8 rounded-lg object-cover border border-emerald-verified/40 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-emerald-tint border border-emerald-verified/40 flex items-center justify-center shrink-0">
                    <FileText size={15} className="text-emerald-verified" />
                  </div>
                )}

                <div className="flex flex-col leading-tight min-w-0">
                  <span className="flex items-center gap-1 font-bold text-emerald-verified">
                    <CheckCircle2 size={13} className="shrink-0" />
                    <span>Photo Attached</span>
                  </span>
                  <span className="text-muted truncate max-w-[140px] text-[11px]">
                    {attachedFile.name} · {attachedFile.size} KB
                  </span>
                </div>

                <button
                  type="button"
                  onClick={removeFile}
                  className="ml-1 p-1 rounded-full hover:bg-emerald-verified/20 text-muted hover:text-danger transition-colors cursor-pointer shrink-0"
                  title="Remove photo"
                  aria-label="Remove photo"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {!attachedFile && (
              <span className="text-[11px] text-muted hidden sm:inline">
                Max 5 MB · JPG, PNG, WebP, PDF
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={!text.trim() || !location.trim() || loading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-saffron hover:bg-saffron-hover disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer min-h-[48px]"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t.complaints?.submitting}</span>
              </>
            ) : (
              <>
                <Send size={15} />
                <span>{t.complaints?.submitBtn}</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-danger-tint border border-danger/40 rounded-xl p-3.5 text-xs text-danger">
            {error}
          </div>
        )}
      </form>

      {/* Result Card with Formal Draft & Duplicate Warning */}
      {registeredComplaint && (
        <div className="bg-surface border-2 border-saffron/40 rounded-2xl p-6 shadow-card space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-verified flex items-center gap-1.5">
                <CheckCircle2 size={15} /> Grievance Classified & Drafted
              </span>
              <h3 className="text-lg font-bold text-navy mt-0.5">
                Ref: {registeredComplaint.id.slice(0, 13)}...
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-info-tint text-info border border-info/30">
                {registeredComplaint.category}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                registeredComplaint.severity === 'high'
                  ? 'bg-danger-tint text-danger border-danger/40 font-extrabold'
                  : registeredComplaint.severity === 'medium'
                  ? 'bg-amber-tint text-amber-warn border-amber-warn/40'
                  : 'bg-slate-100 text-navy border-border'
              }`}>
                {registeredComplaint.severity} Priority
              </span>
            </div>
          </div>

          {/* Department routing */}
          <div className="bg-slate-50 border border-border rounded-xl p-3.5 text-xs text-navy flex items-center gap-2.5">
            <Building2 size={16} className="text-muted shrink-0" />
            <span>
              <strong>{t.complaints?.department}:</strong> {registeredComplaint.department}
            </span>
          </div>

          {/* Duplicate Warning in Code */}
          {registeredComplaint.duplicates_found && registeredComplaint.duplicates_found.length > 0 && (
            <div className="bg-amber-tint/80 border border-amber-warn/40 rounded-xl p-4 text-xs text-navy space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-warn">
                <AlertTriangle size={15} className="shrink-0" />
                <span>
                  {t.complaints?.duplicateWarning?.replace('{n}', registeredComplaint.duplicates_found.length)}
                </span>
              </div>
              <p className="text-muted">
                Found {registeredComplaint.duplicates_found.length} similar complaints in this area within the last 30 days:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {registeredComplaint.duplicates_found.map((dupId, idx) => (
                  <span key={idx} className="font-mono text-[11px] bg-white border border-amber-warn/30 px-2.5 py-0.5 rounded-lg text-amber-warn font-semibold">
                    #{dupId.slice(0, 8)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Formal Administrative Draft */}
          {registeredComplaint.formal_draft && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-navy">
                  {t.complaints?.formalDraft}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => printPetitionPdf(registeredComplaint, lang)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-verified hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>{t.complaints?.downloadPdf || 'Download Official PDF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(registeredComplaint.formal_draft)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-saffron-tint hover:bg-saffron/20 text-saffron text-xs font-bold border border-saffron/30 transition-colors cursor-pointer"
                  >
                    {copiedDraft ? <Check size={14} className="text-emerald-verified" /> : <Copy size={14} />}
                    <span>{copiedDraft ? t.complaints?.copied : t.complaints?.copyDraft}</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 border border-border rounded-xl p-4 font-mono text-xs text-navy whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                {registeredComplaint.formal_draft}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Public Grievance Tracker */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-navy flex items-center gap-2">
              <span>{t.complaints?.trackerTitle} ({filteredTracker.length})</span>
              <span className="w-2 h-2 rounded-full bg-saffron" />
            </h2>
            <p className="text-xs text-muted">
              Transparent tracking of community reports and municipal escalation
            </p>
          </div>

          <button
            type="button"
            onClick={loadTracker}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-xs font-bold text-navy hover:bg-slate-100 transition-colors cursor-pointer bg-white"
          >
            <RefreshCw size={13} className={trackerLoading ? 'animate-spin' : ''} />
            <span>Refresh Tracker</span>
          </button>
        </div>

        {/* Filter categories */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
          {['all', 'road', 'water', 'sanitation', 'electricity', 'health'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-navy text-white shadow-xs'
                  : 'bg-white text-muted hover:bg-slate-100 border border-border'
              }`}
            >
              {t.complaints?.filters?.[cat] || cat}
            </button>
          ))}
        </div>

        {/* Desktop Table View / Mobile Stacked Cards */}
        {filteredTracker.length > 0 ? (
          <>
            {/* Desktop Table (hidden on mobile) */}
            <div className="hidden md:block bg-surface border border-border rounded-2xl overflow-hidden shadow-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-border font-bold uppercase tracking-wider text-muted text-[11px]">
                  <tr>
                    <th className="p-4">Issue & Department</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Days Open</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-navy">
                  {filteredTracker.map((item) => {
                    const { days, isOverdue } = computeDaysOpen(item.created_at)
                    const statusCfg = {
                      received: { label: t.complaints?.statusLabels?.received || 'Received', color: 'bg-slate-100 text-muted border-border' },
                      in_progress: { label: t.complaints?.statusLabels?.in_progress || 'In Progress', color: 'bg-info-tint text-info border-info/30' },
                      resolved: { label: t.complaints?.statusLabels?.resolved || 'Resolved', color: 'bg-emerald-tint text-emerald-verified border-emerald-verified/30' }
                    }[item.status] || { label: item.status, color: 'bg-slate-100 text-muted border-border' }

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4 max-w-xs">
                          <p className="font-semibold text-navy truncate" title={item.text}>{item.text}</p>
                          <p className="text-[11px] text-muted mt-0.5">{item.department}</p>
                        </td>
                        <td className="p-4 text-muted whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} className="text-saffron shrink-0" />
                            <span>{item.location}</span>
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-muted font-medium">
                              {t.complaints?.daysOpen?.replace('{n}', days) || `${days} days`}
                            </span>
                            {isOverdue && item.status !== 'resolved' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger-tint text-danger border border-danger/30">
                                {t.complaints?.overdueTag}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {isOverdue && item.status !== 'resolved' && (
                              <Link
                                to="/tools"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-info-tint hover:bg-info/20 text-info text-xs font-bold transition-colors"
                              >
                                <Scale size={12} />
                                <span>Draft RTI</span>
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() => printPetitionPdf(item, lang)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-navy text-xs font-bold transition-colors cursor-pointer border border-border"
                            >
                              <Printer size={12} />
                              <span>PDF</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (shown on mobile) */}
            <div className="md:hidden grid grid-cols-1 gap-4">
              {filteredTracker.map((item) => {
                const { days, isOverdue } = computeDaysOpen(item.created_at)
                const statusCfg = {
                  received: { label: t.complaints?.statusLabels?.received || 'Received', color: 'bg-slate-100 text-muted border-border' },
                  in_progress: { label: t.complaints?.statusLabels?.in_progress || 'In Progress', color: 'bg-info-tint text-info border-info/30' },
                  resolved: { label: t.complaints?.statusLabels?.resolved || 'Resolved', color: 'bg-emerald-tint text-emerald-verified border-emerald-verified/30' }
                }[item.status] || { label: item.status, color: 'bg-slate-100 text-muted border-border' }

                return (
                  <div key={item.id} className="bg-surface border border-border rounded-2xl p-5 shadow-card space-y-3.5 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                          {item.category}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                          {isOverdue && item.status !== 'resolved' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger-tint text-danger border border-danger/30">
                              {t.complaints?.overdueTag}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-navy font-semibold line-clamp-2">
                        {item.text}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-muted pt-1">
                        <span className="flex items-center gap-1 truncate max-w-[180px]">
                          <MapPin size={13} className="text-saffron shrink-0" />
                          <span className="truncate font-medium">{item.location}</span>
                        </span>
                        <span className="flex items-center gap-1 shrink-0 font-medium">
                          <Clock size={13} className="text-muted" />
                          <span>{t.complaints?.daysOpen?.replace('{n}', days) || `${days} days`}</span>
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-muted bg-slate-50 p-3 rounded-xl border border-border flex items-center justify-between">
                      <span className="truncate mr-2 font-medium">To: {item.department}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {isOverdue && item.status !== 'resolved' && (
                          <Link
                            to="/tools"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-info-tint hover:bg-info/20 text-info text-xs font-bold transition-colors"
                          >
                            <Scale size={12} />
                            <span>RTI</span>
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => printPetitionPdf(item, lang)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-border text-navy text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Printer size={12} />
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-10 bg-surface border border-border rounded-2xl text-xs text-muted shadow-2xs">
            No complaints found in this category.
          </div>
        )}
      </div>

      <Disclaimer />
    </div>
  )
}
