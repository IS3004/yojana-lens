import { useState, useRef, useEffect } from 'react'
import {
  ShieldAlert, ShieldCheck, FileText, Volume2, VolumeX,
  Type, Upload, ExternalLink, Calendar, CheckCircle2,
  AlertTriangle, Copy, Check, ArrowRight
} from 'lucide-react'
import { useLang } from '../i18n/strings'
import client, { useMock } from '../api/client'
import { mockVerify } from '../api/mock'
import VerdictCard from '../components/VerdictCard'
import Disclaimer from '../components/Disclaimer'

export default function Parakh() {
  const { lang, t } = useLang()

  // Mode: 'claim' | 'simplify'
  const [mode, setMode] = useState('claim')

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
        // Add plain code mock link check
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
    const textToRead = `${simplifiedResult.summary}. Key Action items: ${simplifiedResult.action_items.join('. ')}`
    const utterance = new SpeechSynthesisUtterance(textToRead)
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'
    utterance.rate = 0.95

    utterance.onend = () => setIsReadingAloud(false)
    utterance.onerror = () => setIsReadingAloud(false)

    window.speechSynthesis.speak(utterance)
    setIsReadingAloud(true)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Title & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>Parakh (परख)</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
              Truth & Clarity Engine
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {mode === 'claim' ? t.parakh.subtitle : t.parakh.simplifySubtitle}
          </p>
        </div>

        {/* Mode Switch Pills */}
        <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setMode('claim')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              mode === 'claim'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck size={14} className={mode === 'claim' ? 'text-emerald-600' : ''} />
            <span>{t.parakh.modeCheck}</span>
          </button>
          <button
            onClick={() => setMode('simplify')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              mode === 'simplify'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText size={14} className={mode === 'simplify' ? 'text-orange-600' : ''} />
            <span>{t.parakh.modeSimplify}</span>
          </button>
        </div>
      </div>

      {/* ────────────────── MODE 1: CLAIM CHECKER ────────────────── */}
      {mode === 'claim' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Forwarded message or rumor claim
              </label>
              <textarea
                rows={4}
                value={claimText}
                onChange={(e) => setClaimText(e.target.value)}
                placeholder={t.parakh.placeholder}
                className="w-full text-sm text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            {/* File Upload & Samples */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                >
                  <Upload size={13} />
                  <span>Upload screenshot / PDF</span>
                </button>
              </div>

              <button
                onClick={() => handleVerify(claimText)}
                disabled={!claimText.trim() || claimLoading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 text-white disabled:text-slate-400 font-semibold text-xs shadow-sm transition-all"
              >
                {claimLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
              <span>Test samples:</span>
              {sampleMessages.map((sample, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setClaimText(sample.text)
                    handleVerify(sample.text)
                  }}
                  className="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {claimError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800">
              {claimError}
            </div>
          )}

          {verdictResult && <VerdictCard result={verdictResult} />}
        </div>
      )}

      {/* ────────────────── MODE 2: NOTICE SIMPLIFIER ────────────────── */}
      {mode === 'simplify' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Official Government Notification or Gazette Text
              </label>
              <textarea
                rows={4}
                value={noticeText}
                onChange={(e) => setNoticeText(e.target.value)}
                placeholder={t.parakh.simplifyPlaceholder}
                className="w-full text-sm text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-xs font-semibold text-orange-800 border border-orange-200 transition-colors"
              >
                <Upload size={13} />
                <span>Upload Circular PDF / Image</span>
              </button>

              <button
                onClick={() => handleSimplify(noticeText)}
                disabled={!noticeText.trim() || simplifyLoading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-semibold text-xs shadow-sm transition-all"
              >
                {simplifyLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800">
              {simplifyError}
            </div>
          )}

          {/* Side-by-Side Original vs Simplified View */}
          {simplifiedResult && (
            <div className="space-y-4">
              {/* Accessibility Toolbar */}
              <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-xl text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>Notice Analysis Complete</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSpeech}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      isReadingAloud
                        ? 'bg-rose-600 text-white'
                        : 'bg-white text-slate-800 hover:bg-slate-200 border border-slate-300'
                    }`}
                  >
                    {isReadingAloud ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    <span>{isReadingAloud ? t.parakh.stopAudio : t.parakh.readAloud}</span>
                  </button>
                  <button
                    onClick={() => setIsLargeText(!isLargeText)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-200 text-xs font-bold"
                  >
                    <Type size={14} />
                    <span>{isLargeText ? t.parakh.normalText : t.parakh.largerText}</span>
                  </button>
                </div>
              </div>

              {/* Side by side layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Original Document / Raw input */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t.parakh.originalNotice}
                  </h3>
                  <div className="max-h-96 overflow-y-auto bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">
                    {noticeText || 'Document uploaded as PDF/Image circular.'}
                  </div>
                </div>

                {/* Simplified Citizen Breakdown */}
                <div className={`bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-4 ${isLargeText ? 'text-base' : 'text-xs'}`}>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
                      {t.parakh.simplifiedNotice}
                    </h3>
                    <p className={`text-slate-800 leading-relaxed font-medium bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 ${isLargeText ? 'text-base' : 'text-xs'}`}>
                      {simplifiedResult.summary}
                    </p>
                  </div>

                  {/* Key Dates */}
                  {simplifiedResult.key_dates?.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <Calendar size={13} className="text-orange-600" />
                        <span>{t.parakh.keyDates}</span>
                      </h4>
                      <div className="space-y-1.5">
                        {simplifiedResult.key_dates.map((kd, i) => (
                          <div key={i} className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
                            <span className="font-bold text-orange-700 shrink-0">{kd.date}:</span>
                            <span className="text-slate-700">{kd.what}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Items */}
                  {simplifiedResult.action_items?.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span>{t.parakh.actionItems}</span>
                      </h4>
                      <ul className="space-y-1 text-xs text-slate-700">
                        {simplifiedResult.action_items.map((act, i) => (
                          <li key={i} className="flex items-start gap-1.5 bg-emerald-50/40 p-2 rounded-lg border border-emerald-100">
                            <span className="font-bold text-emerald-600">•</span>
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Risks & Warnings */}
                  {simplifiedResult.risks?.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                        <AlertTriangle size={13} className="text-rose-600" />
                        <span>{t.parakh.risksWarnings}</span>
                      </h4>
                      <ul className="space-y-1 text-xs text-slate-700">
                        {simplifiedResult.risks.map((risk, i) => (
                          <li key={i} className="flex items-start gap-1.5 bg-rose-50/50 p-2 rounded-lg border border-rose-100 text-rose-900">
                            <span className="font-bold text-rose-600">!</span>
                            <span>{risk}</span>
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

      {/* Safety Tips Box (Rule 2e) */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
          <ShieldAlert size={15} className="text-amber-700" />
          <span>{t.parakh.safetyTitle}</span>
        </h3>
        <ul className="space-y-2 text-xs text-amber-900/90 leading-relaxed">
          {t.parakh.safety.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Prototype Notice Banner */}
      <Disclaimer />
    </div>
  )
}
