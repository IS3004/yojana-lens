import { useState, useRef, useEffect } from 'react'
import {
  ShieldAlert, ShieldCheck, FileText, Volume2, VolumeX,
  Type, Upload, Calendar, CheckCircle2,
  AlertTriangle, Copy, Check, Lock, PhoneCall
} from 'lucide-react'
import { useLang } from '../i18n/strings'
import client, { useMock } from '../api/client'
import { mockVerify } from '../api/mock'
import VerdictCard from '../components/VerdictCard'
import Disclaimer from '../components/Disclaimer'

export default function Parakh() {
  const { lang, t } = useLang()
  const isHi = lang === 'hi'

  // Mode: 'claim' | 'simplify'
  const [mode, setMode] = useState('claim')
  const [noticeMobileTab, setNoticeMobileTab] = useState('simplified') // 'original' | 'simplified'

  // Claim checking state
  const [claimText, setClaimText] = useState('')
  const [claimLoading, setClaimLoading] = useState(false)
  const [verdictResult, setVerdictResult] = useState(null)
  const [claimError, setClaimError] = useState(null)
  const claimFileInputRef = useRef(null)

  // Notice simplification state
  const [noticeText, setNoticeText] = useState('')
  const [simplifyLoading, setSimplifyLoading] = useState(false)
  const [simplifiedResult, setSimplifiedResult] = useState(null)
  const [simplifyError, setSimplifyError] = useState(null)
  const [isReadingAloud, setIsReadingAloud] = useState(false)
  const [isLargeText, setIsLargeText] = useState(false)
  const [copiedNotice, setCopiedNotice] = useState(false)
  const noticeFileInputRef = useRef(null)

  // Sample claims for quick test
  const sampleMessages = [
    {
      label: 'Free Smartphone/Laptop Link',
      text: 'Govt is giving FREE laptops to all students under PM Free Laptop Yojana 2026! Register urgently at http://bit.ly/free-schemes-now before slots close!',
    },
    {
      label: 'PM-Kisan 19th Installment Notice',
      text: 'Government of India has released PM Kisan Samman Nidhi installment of Rs 2000 to eligible farmers. Confirm your e-KYC status at pmkisan.gov.in.',
    },
  ]

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // ─── 1. Claim Verification (POST /verify) ───────────────────────────────
  const handleVerify = async (textToVerify = claimText, uploadedFile = null) => {
    if (!textToVerify.trim() && !uploadedFile) return
    setClaimLoading(true)
    setClaimError(null)
    setVerdictResult(null)

    try {
      if (useMock && !uploadedFile) {
        const res = await mockVerify({ text: textToVerify, lang })
        const hasExternal = textToVerify.includes('bit.ly') || textToVerify.includes('http')
        const link_flags = hasExternal ? [
          { url: 'http://bit.ly/free-schemes-now', is_official: false, reason: 'Non-government external link; high phishing risk' }
        ] : [
          { url: 'https://pmkisan.gov.in', is_official: true, reason: 'Official Indian Government portal (.gov.in)' }
        ]
        setVerdictResult({ ...res.data, link_flags })
      } else {
        const formData = new FormData()
        if (textToVerify) formData.append('text', textToVerify)
        formData.append('lang', lang)
        if (uploadedFile) formData.append('file', uploadedFile)

        const res = await client.post('/verify', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        setVerdictResult(res.data)
      }
    } catch (err) {
      console.error(err)
      setClaimError(err.message || 'Verification could not complete.')
    } finally {
      setClaimLoading(false)
      if (claimFileInputRef.current) claimFileInputRef.current.value = ''
    }
  }

  // ─── 2. Notice Simplification (POST /simplify) ──────────────────────────
  const handleSimplify = async (textToSimplify = noticeText, uploadedFile = null) => {
    if (!textToSimplify.trim() && !uploadedFile) return
    setSimplifyLoading(true)
    setSimplifyError(null)
    setSimplifiedResult(null)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsReadingAloud(false)
    }

    try {
      if (useMock && !uploadedFile) {
        await new Promise((r) => setTimeout(r, 900))
        setSimplifiedResult({
          summary: 'The Ministry of Agriculture has issued new administrative guidelines regarding Aadhaar-linked direct bank transfer for rural farmer grants.',
          key_dates: [
            { date: '2026-11-30', what: 'Deadline for completing biometric e-KYC' },
            { date: '2026-12-15', what: 'Release date for next installment tranche' }
          ],
          action_items: [
            'Visit the official pmkisan.gov.in portal or nearest CSC kiosk.',
            'Link your active mobile number with your bank account.',
            'Verify that land possession records match revenue survey entries.'
          ],
          risks: [
            'Do not share OTP or Aadhaar passwords with unaccredited intermediaries.',
            'Govt departments do not charge fee payments through UPI QR codes.'
          ],
          translated_text: textToSimplify
        })
      } else {
        const formData = new FormData()
        if (textToSimplify) formData.append('text', textToSimplify)
        formData.append('lang', lang)
        if (uploadedFile) formData.append('file', uploadedFile)

        const res = await client.post('/simplify', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        setSimplifiedResult(res.data)
      }
    } catch (err) {
      console.error(err)
      setSimplifyError(err.message || 'Could not simplify document.')
    } finally {
      setSimplifyLoading(false)
      if (noticeFileInputRef.current) noticeFileInputRef.current.value = ''
    }
  }

  // Text to Speech playback
  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) return

    if (isReadingAloud) {
      window.speechSynthesis.cancel()
      setIsReadingAloud(false)
      return
    }

    if (!simplifiedResult?.summary) return
    const textToRead = `${simplifiedResult.summary}. Key Action items: ${simplifiedResult.action_items?.join('. ') || ''}`
    const utterance = new SpeechSynthesisUtterance(textToRead)
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'
    utterance.rate = 0.95

    utterance.onend = () => setIsReadingAloud(false)
    utterance.onerror = () => setIsReadingAloud(false)

    window.speechSynthesis.speak(utterance)
    setIsReadingAloud(true)
  }

  const handleCopyNoticeSummary = () => {
    if (!simplifiedResult) return
    const text = `[YojanaLens Simplified Notice Summary]\n\n${simplifiedResult.summary}\n\nKey Dates:\n${simplifiedResult.key_dates?.map(d => `- ${d.date}: ${d.what}`).join('\n') || 'None'}\n\nAction Items:\n${simplifiedResult.action_items?.map(a => `- ${a}`).join('\n') || 'None'}`
    navigator.clipboard.writeText(text)
    setCopiedNotice(true)
    setTimeout(() => setCopiedNotice(false), 2000)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10 space-y-8">
      {/* Title & Segmented Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
              {isHi ? 'परख (Parakh) — सत्य व परिपत्र विश्लेषक' : 'Parakh (परख) — Claim & Notice Checker'}
            </h1>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-tint text-emerald-verified font-bold border border-emerald-verified/30">
              PIB & Official Verification
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted">
            {mode === 'claim' ? t.parakh.subtitle : t.parakh.simplifySubtitle}
          </p>
        </div>

        {/* Segmented Control "Check a claim | Simplify a notice" */}
        <div className="inline-flex rounded-xl p-1 bg-white border border-border shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('claim')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              mode === 'claim'
                ? 'bg-navy text-white shadow-xs'
                : 'text-muted hover:text-navy hover:bg-slate-50'
            }`}
          >
            <ShieldCheck size={15} className={mode === 'claim' ? 'text-emerald-verified' : ''} />
            <span>{t.parakh.modeCheck}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('simplify')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              mode === 'simplify'
                ? 'bg-navy text-white shadow-xs'
                : 'text-muted hover:text-navy hover:bg-slate-50'
            }`}
          >
            <FileText size={15} className={mode === 'simplify' ? 'text-saffron' : ''} />
            <span>{t.parakh.modeSimplify}</span>
          </button>
        </div>
      </div>

      {/* ────────────────── MODE 1: CLAIM CHECKER ────────────────── */}
      {mode === 'claim' && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-card space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">
                Forwarded message, WhatsApp rumor, or scheme claim
              </label>
              <textarea
                rows={4}
                value={claimText}
                onChange={(e) => setClaimText(e.target.value)}
                placeholder={t.parakh.placeholder}
                className="w-full text-sm text-navy placeholder:text-muted/70 border border-border rounded-xl p-3.5 focus-visible:outline-3 focus-visible:outline-saffron focus-visible:outline-offset-2 transition-all bg-white"
              />
            </div>

            {/* File Upload & Verify Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={claimFileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleVerify(claimText, file)
                  }}
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => claimFileInputRef.current?.click()}
                  disabled={claimLoading}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-navy transition-colors cursor-pointer border border-border"
                >
                  <Upload size={14} />
                  <span>Upload screenshot / PDF</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleVerify(claimText)}
                disabled={!claimText.trim() || claimLoading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-saffron hover:bg-saffron-hover disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer min-h-[48px]"
              >
                {claimLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t.parakh.verifying}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>{t.parakh.verify}</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Sample Links */}
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-muted">
              <span className="font-semibold">Quick test:</span>
              {sampleMessages.map((sample, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setClaimText(sample.text)
                    handleVerify(sample.text)
                  }}
                  className="text-xs px-3 py-1.5 rounded-full bg-slate-100 hover:bg-saffron-tint hover:border-saffron/40 hover:text-saffron text-navy transition-all border border-border font-medium cursor-pointer"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {claimError && (
            <div className="bg-danger-tint border border-danger/40 rounded-xl p-4 text-xs sm:text-sm text-danger">
              {claimError}
            </div>
          )}

          {verdictResult && <VerdictCard result={verdictResult} />}
        </div>
      )}

      {/* ────────────────── MODE 2: NOTICE SIMPLIFIER ────────────────── */}
      {mode === 'simplify' && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-card space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">
                Official Government Notification or Gazette Text
              </label>
              <textarea
                rows={4}
                value={noticeText}
                onChange={(e) => setNoticeText(e.target.value)}
                placeholder={t.parakh.simplifyPlaceholder}
                className="w-full text-sm text-navy placeholder:text-muted/70 border border-border rounded-xl p-3.5 focus-visible:outline-3 focus-visible:outline-saffron focus-visible:outline-offset-2 transition-all bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
              <input
                type="file"
                ref={noticeFileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleSimplify(noticeText, file)
                }}
                accept="image/jpeg,image/png,image/jpg,application/pdf"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => noticeFileInputRef.current?.click()}
                disabled={simplifyLoading}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-saffron-tint hover:bg-saffron/20 text-xs font-semibold text-saffron border border-saffron/30 transition-colors cursor-pointer"
              >
                <Upload size={14} />
                <span>Upload Circular PDF / Image</span>
              </button>

              <button
                type="button"
                onClick={() => handleSimplify(noticeText)}
                disabled={!noticeText.trim() || simplifyLoading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-saffron hover:bg-saffron-hover disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer min-h-[48px]"
              >
                {simplifyLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t.parakh.simplifying}</span>
                  </>
                ) : (
                  <>
                    <FileText size={16} />
                    <span>{t.parakh.simplifyBtn}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {simplifyError && (
            <div className="bg-danger-tint border border-danger/40 rounded-xl p-4 text-xs sm:text-sm text-danger">
              {simplifyError}
            </div>
          )}

          {/* Original vs Simplified Notice Breakdown */}
          {simplifiedResult && (
            <div className="space-y-4">
              {/* Accessibility & Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3.5 rounded-2xl border border-border shadow-2xs">
                <span className="flex items-center gap-2 text-xs font-bold text-navy">
                  <CheckCircle2 size={16} className="text-emerald-verified" />
                  <span>Notice Analysis Complete</span>
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSpeech}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isReadingAloud
                        ? 'bg-danger text-white'
                        : 'bg-white text-navy hover:bg-slate-100 border border-border'
                    }`}
                  >
                    {isReadingAloud ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    <span>{isReadingAloud ? t.parakh.stopAudio : t.parakh.readAloud}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLargeText(!isLargeText)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-border hover:bg-slate-100 text-xs font-bold text-navy cursor-pointer"
                  >
                    <Type size={15} />
                    <span>{isLargeText ? t.parakh.normalText : t.parakh.largerText}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyNoticeSummary}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-border hover:bg-slate-100 text-xs font-bold text-navy cursor-pointer"
                  >
                    {copiedNotice ? <Check size={15} className="text-emerald-verified" /> : <Copy size={15} />}
                    <span>{copiedNotice ? t.parakh.copied : 'Copy Plain Summary'}</span>
                  </button>
                </div>
              </div>

              {/* Mobile Tab Switcher (Original / Simplified) */}
              <div className="flex md:hidden border-b border-border gap-2">
                <button
                  type="button"
                  onClick={() => setNoticeMobileTab('simplified')}
                  className={`flex-1 py-2 text-xs font-bold border-b-2 ${
                    noticeMobileTab === 'simplified' ? 'border-saffron text-saffron' : 'border-transparent text-muted'
                  }`}
                >
                  {t.parakh.simplifiedNotice}
                </button>
                <button
                  type="button"
                  onClick={() => setNoticeMobileTab('original')}
                  className={`flex-1 py-2 text-xs font-bold border-b-2 ${
                    noticeMobileTab === 'original' ? 'border-saffron text-saffron' : 'border-transparent text-muted'
                  }`}
                >
                  {t.parakh.originalNotice}
                </button>
              </div>

              {/* Side-by-side on desktop, tabbed on mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Original Document / Raw input */}
                <div className={`bg-surface border border-border rounded-2xl p-5 shadow-card space-y-3 ${
                  noticeMobileTab !== 'original' ? 'hidden md:block' : 'block'
                }`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                    {t.parakh.originalNotice}
                  </h3>
                  <div className="max-h-96 overflow-y-auto bg-slate-50 p-3.5 rounded-xl border border-border text-xs text-navy leading-relaxed font-mono whitespace-pre-wrap">
                    {noticeText || 'Document uploaded as PDF/Image circular.'}
                  </div>
                </div>

                {/* Simplified Citizen Breakdown: 3 blocks (Who, What, Deadline) with amber highlights */}
                <div className={`bg-surface border border-emerald-verified/30 rounded-2xl p-5 sm:p-6 shadow-card space-y-5 ${
                  noticeMobileTab !== 'simplified' ? 'hidden md:block' : 'block'
                }`}>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-verified mb-1.5">
                      {t.parakh.simplifiedNotice}
                    </h3>
                    <p className={`text-navy leading-relaxed font-semibold bg-emerald-tint/50 p-4 rounded-xl border border-emerald-verified/30 ${
                      isLargeText ? 'text-base' : 'text-sm'
                    }`}>
                      {simplifiedResult.summary}
                    </p>
                  </div>

                  {/* 1. Key Dates & Deadlines */}
                  {simplifiedResult.key_dates?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-warn flex items-center gap-1.5">
                        <Calendar size={14} className="text-amber-warn" />
                        <span>{t.parakh.keyDates}</span>
                      </h4>
                      <div className="space-y-2">
                        {simplifiedResult.key_dates.map((kd, i) => (
                          <div key={i} className="flex items-start gap-2.5 bg-amber-tint/60 p-3 rounded-xl border border-amber-warn/30 text-xs">
                            <span className="font-bold text-amber-warn shrink-0">{kd.date}:</span>
                            <span className="text-navy font-medium">{kd.what}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Concrete Action Items */}
                  {simplifiedResult.action_items?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-verified flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-verified" />
                        <span>{t.parakh.actionItems}</span>
                      </h4>
                      <ul className="space-y-2 text-xs text-navy">
                        {simplifiedResult.action_items.map((act, i) => (
                          <li key={i} className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-border">
                            <span className="font-bold text-emerald-verified shrink-0">•</span>
                            <span className="font-medium">{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 3. Risks & Warnings */}
                  {simplifiedResult.risks?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-danger flex items-center gap-1.5">
                        <AlertTriangle size={14} className="text-danger" />
                        <span>{t.parakh.risksWarnings}</span>
                      </h4>
                      <ul className="space-y-2 text-xs text-navy">
                        {simplifiedResult.risks.map((risk, i) => (
                          <li key={i} className="flex items-start gap-2 bg-danger-tint/50 p-3 rounded-xl border border-danger/30 text-danger">
                            <span className="font-bold shrink-0">!</span>
                            <span className="font-semibold">{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Red-Bordered Safety Box Pinned at Bottom */}
      <div
        role="alert"
        className="bg-danger-tint/60 border-2 border-danger rounded-2xl p-5 sm:p-6 space-y-3 shadow-card"
      >
        <div className="flex items-center gap-2.5 text-danger font-bold text-sm">
          <Lock size={18} className="shrink-0" />
          <h3 className="uppercase tracking-wider font-extrabold text-xs sm:text-sm">
            {t.parakh.safetyTitle || 'Citizen Cyber Safeguard & Scam Alert'}
          </h3>
        </div>

        <p className="text-xs sm:text-sm font-bold text-danger">
          Never share OTP, PIN, or bank passwords with anyone. No legitimate government scheme charges fees via WhatsApp links.
        </p>

        <ul className="space-y-2 text-xs text-navy leading-relaxed pt-1">
          {t.parakh.safety.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-danger font-bold shrink-0">•</span>
              <span className="font-medium">{tip}</span>
            </li>
          ))}
        </ul>

        <div className="pt-2 border-t border-danger/20 flex flex-wrap items-center gap-4 text-xs font-bold text-danger">
          <span className="flex items-center gap-1.5">
            <PhoneCall size={14} />
            <span>National Cybercrime Helpline: 1930</span>
          </span>
          <span>•</span>
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-navy"
          >
            cybercrime.gov.in
          </a>
        </div>
      </div>

      {/* Civic Prototype Disclaimer */}
      <Disclaimer />
    </div>
  )
}
