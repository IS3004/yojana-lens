import { useState, useEffect, useRef } from 'react'
import {
  AlertOctagon, Copy, Check, Upload, Send, Clock, AlertTriangle,
  Building2, MapPin, Tag, RefreshCw, CheckCircle2, ChevronDown, ChevronUp, AlertCircle,
  Paperclip, X, ImageIcon, FileText, Printer, FileDown
} from 'lucide-react'
import { useLang } from '../i18n/strings'
import client, { useMock } from '../api/client'
import VoiceButton from '../components/VoiceButton'
import Disclaimer from '../components/Disclaimer'
import { printPetitionPdf } from '../utils/pdfGenerator'

export default function Complaints() {
  const { lang, t } = useLang()

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
    // tiny delay so re-mount triggers the CSS keyframe
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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Prominent Prototype Banner (Rule 3d) */}
      <div className="bg-amber-100/90 border border-amber-300 text-amber-900 rounded-xl px-4 py-3 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <AlertOctagon size={16} className="text-amber-700 shrink-0" />
          <span>{t.complaints?.protoBanner || 'Prototype. Not connected to any government portal.'}</span>
        </div>
        <span className="text-[11px] opacity-75 hidden sm:inline">Official-format administrative drafting tool</span>
      </div>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
          <span>{t.complaints?.title || 'Civic Grievance & Complaints'}</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
            Administrative Drafter
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          {t.complaints?.subtitle}
        </p>
      </div>

      {/* Grievance Submission Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Civic Problem Description
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.complaints?.issuePlaceholder}
                className="w-full text-sm text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all pr-12"
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

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Location / Area
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t.complaints?.locationPlaceholder}
              className="w-full text-sm text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            />
            <p className="text-[11px] text-slate-400 pt-1">
              Used for duplicate clustering and department routing.
            </p>
          </div>
        </div>

        {/* File upload & Submit row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Attach button — hidden once file is selected */}
            {!attachedFile && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
              >
                <Paperclip size={13} />
                <span>{t.complaints?.photoBtn || 'Attach photo'}</span>
              </button>
            )}

            {/* Animated attachment badge */}
            {attachedFile && (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-emerald-400 bg-emerald-50 shadow-sm text-xs font-semibold text-emerald-800 transition-all duration-300 ${
                  attachAnim ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-1'
                }`}
                style={{ transform: attachAnim ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(4px)', transition: 'all 0.25s cubic-bezier(.34,1.56,.64,1)' }}
              >
                {/* Thumbnail or PDF icon */}
                {attachedFile.preview ? (
                  <img
                    src={attachedFile.preview}
                    alt="preview"
                    className="w-8 h-8 rounded-lg object-cover border border-emerald-300 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0">
                    <FileText size={14} className="text-emerald-600" />
                  </div>
                )}

                <div className="flex flex-col leading-tight min-w-0">
                  {/* Animated checkmark + "Attached" label */}
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-600 shrink-0 animate-bounce" />
                    <span className="text-emerald-700 font-bold">Attached!</span>
                  </span>
                  <span className="text-emerald-600 truncate max-w-[140px] text-[11px]">
                    {attachedFile.name} · {attachedFile.size} KB
                  </span>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={removeFile}
                  className="ml-1 p-0.5 rounded-full hover:bg-emerald-200 text-emerald-500 hover:text-rose-600 transition-colors shrink-0"
                  title="Remove photo"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {!attachedFile && (
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Max 5 MB · JPG, PNG, WebP, PDF
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={!text.trim() || !location.trim() || loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-semibold text-xs shadow-sm transition-all"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t.complaints?.submitting}</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>{t.complaints?.submitBtn}</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800">
            {error}
          </div>
        )}
      </form>

      {/* Result Card with Formal Draft & Duplicate Warning */}
      {registeredComplaint && (
        <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-md space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 size={15} /> Grievance Classified & Drafted
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                ID: {registeredComplaint.id.slice(0, 13)}...
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category */}
              <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                {registeredComplaint.category}
              </span>
              {/* Severity */}
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                registeredComplaint.severity === 'high'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : registeredComplaint.severity === 'medium'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-slate-50 text-slate-800 border-slate-200'
              }`}>
                {registeredComplaint.severity} Priority
              </span>
            </div>
          </div>

          {/* Department routing */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 flex items-center gap-2">
            <Building2 size={16} className="text-slate-500 shrink-0" />
            <span>
              <strong>{t.complaints?.department}:</strong> {registeredComplaint.department}
            </span>
          </div>

          {/* Duplicate Warning in Code (Rule 3b) */}
          {registeredComplaint.duplicates_found && registeredComplaint.duplicates_found.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle size={15} className="text-amber-600" />
                <span>
                  {t.complaints?.duplicateWarning?.replace('{n}', registeredComplaint.duplicates_found.length)}
                </span>
              </div>
              <p className="text-slate-600">
                Found {registeredComplaint.duplicates_found.length} similar complaints in this area within the last 30 days:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {registeredComplaint.duplicates_found.map((dupId, idx) => (
                  <span key={idx} className="font-mono text-[11px] bg-white border border-amber-200 px-2 py-0.5 rounded text-amber-900">
                    #{dupId.slice(0, 8)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Formal Administrative Draft */}
          {registeredComplaint.formal_draft && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {t.complaints?.formalDraft}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => printPetitionPdf(registeredComplaint, lang)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <Printer size={14} />
                    <span>{t.complaints?.downloadPdf || 'Download Official PDF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(registeredComplaint.formal_draft)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200 transition-colors"
                  >
                    {copiedDraft ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copiedDraft ? t.complaints?.copied : t.complaints?.copyDraft}</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                {registeredComplaint.formal_draft}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Public Grievance Tracker */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {t.complaints?.trackerTitle} ({filteredTracker.length})
            </h2>
            <p className="text-xs text-slate-500">
              Transparent public tracking of community reports and municipal escalation
            </p>
          </div>

          <button
            onClick={loadTracker}
            className="self-start sm:self-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={13} className={trackerLoading ? 'animate-spin' : ''} />
            <span>Refresh Tracker</span>
          </button>
        </div>

        {/* Filter categories */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
          {['all', 'road', 'water', 'sanitation', 'electricity', 'health'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                categoryFilter === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.complaints?.filters?.[cat] || cat}
            </button>
          ))}
        </div>

        {/* Grievance list cards */}
        {filteredTracker.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTracker.map((item) => {
              const { days, isOverdue } = computeDaysOpen(item.created_at)
              const statusCfg = {
                received: { label: t.complaints?.statusLabels?.received || 'Received', color: 'bg-blue-50 text-blue-800 border-blue-200' },
                in_progress: { label: t.complaints?.statusLabels?.in_progress || 'In Progress', color: 'bg-amber-50 text-amber-800 border-amber-200' },
                resolved: { label: t.complaints?.statusLabels?.resolved || 'Resolved', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
              }[item.status] || { label: item.status, color: 'bg-slate-100 text-slate-700 border-slate-200' }

              return (
                <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {item.category}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                        {/* Red Overdue Tag if open > 15 days and not resolved */}
                        {isOverdue && item.status !== 'resolved' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                            {t.complaints?.overdueTag}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-800 font-medium line-clamp-2">
                      {item.text}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1 truncate max-w-[180px]">
                        <MapPin size={11} className="text-orange-600 shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Clock size={11} className="text-slate-400" />
                        <span>{t.complaints?.daysOpen?.replace('{n}', days) || `${days} days`}</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between">
                    <span className="truncate mr-2 font-medium">To: {item.department}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => printPetitionPdf(item, lang)}
                        title="Download / Print Official Petition PDF"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        <Printer size={10} />
                        <span>PDF</span>
                      </button>
                      <span className="font-mono text-[10px] text-slate-400">#{item.id.slice(0, 8)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
            No complaints found in this category.
          </div>
        )}
      </div>

      <Disclaimer />
    </div>
  )
}

