import { useState } from 'react'
import {
  ExternalLink, ChevronDown, ChevronUp, CheckCircle, HelpCircle,
  Clock, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, MessageCircle, Volume2, VolumeX, Lightbulb
} from 'lucide-react'
import { useLang } from '../i18n/strings'
import SourceBadge from './SourceBadge'
import DocumentChecklist from './DocumentChecklist'
import client, { useMock } from '../api/client'

export default function SchemeCard({ scheme }) {
  const { lang, t } = useLang()
  const [showWhy, setShowWhy] = useState(false)
  const [showUnknown, setShowUnknown] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  // Grounded Q&A per scheme state
  const [question, setQuestion] = useState('')
  const [qaLoading, setQaLoading] = useState(false)
  const [qaAnswer, setQaAnswer] = useState(null)
  const [showQaBox, setShowQaBox] = useState(false)

  const isHi = lang === 'hi'
  const title = (isHi && scheme.scheme_hi) ? scheme.scheme_hi : scheme.scheme
  const benefit = (isHi && scheme.benefit_hi) ? scheme.benefit_hi : scheme.benefit
  const isLikely = scheme.status === 'likely_eligible'
  const isAlmost = !!scheme.what_would_change_this

  // Deadline calculation
  const computeDeadlines = (closesOn) => {
    if (!closesOn) return null
    try {
      const target = new Date(closesOn)
      const now = new Date()
      const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
      if (diffDays < 0) {
        return { text: isHi ? 'आवेदन समाप्त' : 'Closed', color: 'bg-slate-100 text-muted border-border', isCritical: false }
      }
      if (diffDays <= 7) {
        return {
          text: t.khoj.closesInDays?.replace('{n}', diffDays) || `Closes in ${diffDays} days`,
          color: 'bg-danger-tint text-danger border-danger/40 font-bold',
          isCritical: true
        }
      }
      if (diffDays <= 30) {
        return {
          text: t.khoj.closesInDays?.replace('{n}', diffDays) || `Closes in ${diffDays} days`,
          color: 'bg-amber-tint text-amber-warn border-amber-warn/40 font-semibold',
          isCritical: false
        }
      }
      return {
        text: `Closes: ${closesOn}`,
        color: 'bg-slate-100 text-navy border-border',
        isCritical: false
      }
    } catch {
      return null
    }
  }

  const deadlineBadge = computeDeadlines(scheme.closes_on)

  // Timeline status config
  const timeline = scheme.timeline_status || 'active'
  const timelineConfig = {
    active: {
      label: t.khoj.timelineStatus?.active || 'Available Now',
      color: 'bg-emerald-tint text-emerald-verified border-emerald-verified/30',
      dot: 'bg-emerald-verified',
      icon: <CheckCircle2 size={13} className="text-emerald-verified shrink-0" />
    },
    upcoming: {
      label: t.khoj.timelineStatus?.upcoming || 'Upcoming Soon',
      color: 'bg-info-tint text-info border-info/30',
      dot: 'bg-info',
      icon: <Clock size={13} className="text-info shrink-0" />
    },
    ended: {
      label: t.khoj.timelineStatus?.ended || 'Closed / Ended',
      color: 'bg-slate-100 text-muted border-border',
      dot: 'bg-muted',
      icon: <XCircle size={13} className="text-muted shrink-0" />
    }
  }[timeline] || {
    label: 'Available',
    color: 'bg-emerald-tint text-emerald-verified border-emerald-verified/30',
    dot: 'bg-emerald-verified',
    icon: <CheckCircle2 size={13} className="text-emerald-verified shrink-0" />
  }

  const handleAskQuestion = async (e) => {
    e.preventDefault()
    if (!question.trim() || qaLoading) return
    setQaLoading(true)
    setQaAnswer(null)

    try {
      if (useMock) {
        // Grounded fallback response for demo mock mode
        await new Promise((r) => setTimeout(r, 600))
        setQaAnswer({
          answer: `According to official verified guidelines for ${scheme.scheme}: eligibility and requirements are outlined on the official portal. If not stated, no private fee is required.`,
          grounded: true,
          source_url: scheme.source_url || scheme.apply_url
        })
      } else {
        const res = await client.post('/ask-scheme', {
          scheme_id: scheme.id,
          question: question.trim(),
          lang
        })
        setQaAnswer(res.data)
      }
    } catch (err) {
      setQaAnswer({
        answer: 'This information is not available in our verified scheme records. Please verify directly on the official portal.',
        grounded: false,
        source_url: scheme.source_url || scheme.apply_url
      })
    } finally {
      setQaLoading(false)
    }
  }

  const handleReadAloud = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }

    const textToRead = `${title}. ${benefit}. ${scheme.reason || ''}`
    const utterance = new SpeechSynthesisUtterance(textToRead)
    utterance.lang = isHi ? 'hi-IN' : 'en-IN'
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  // 4px status stripe: emerald for likely eligible, amber for check at office
  const stripeClass = isAlmost
    ? 'border-2 border-dashed border-info/50 bg-info-tint/10'
    : isLikely
    ? 'border-t-4 border-t-emerald-verified'
    : 'border-t-4 border-t-amber-warn'

  return (
    <div className={`rounded-2xl border border-border shadow-card transition-all flex flex-col justify-between overflow-hidden bg-surface hover:shadow-md ${stripeClass} ${
      timeline === 'ended' ? 'opacity-85' : ''
    }`}>
      <div className="p-5 space-y-4">
        {/* Timeline, Deadline & Status Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${timelineConfig.color}`}>
              <span className={`w-2 h-2 rounded-full ${timelineConfig.dot}`} />
              {timelineConfig.label}
            </span>

            {/* Deadline badge (amber < 30 days, red < 7 days) */}
            {deadlineBadge && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border ${deadlineBadge.color}`}>
                <Clock size={11} className="shrink-0" />
                <span>{deadlineBadge.text}</span>
              </span>
            )}

            {/* Dates confirmed tag */}
            {scheme.dates_confirmed === false && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-tint text-amber-warn border border-amber-warn/30" title="Official timeline dates have not been locked by ministry circular">
                <AlertTriangle size={10} className="text-amber-warn shrink-0" />
                <span>{t.khoj.datesNotConfirmed}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs px-3 py-1 rounded-full font-semibold whitespace-nowrap shrink-0 border inline-flex items-center gap-1 ${
                isAlmost
                  ? 'bg-info-tint text-info border-info/40'
                  : isLikely
                  ? 'bg-emerald-tint text-emerald-verified border-emerald-verified/30'
                  : 'bg-amber-tint text-amber-warn border-amber-warn/30'
              }`}
            >
              {isAlmost ? (
                <>
                  <Lightbulb size={12} className="shrink-0" />
                  <span>{t.khoj.almostEligible || 'Almost eligible'}</span>
                </>
              ) : isLikely ? (
                <>
                  <CheckCircle2 size={12} className="shrink-0" />
                  <span>{t.khoj.likelyEligible}</span>
                </>
              ) : (
                <>
                  <HelpCircle size={12} className="shrink-0" />
                  <span>{t.khoj.checkAtOffice}</span>
                </>
              )}
            </span>

            {/* Read aloud button */}
            <button
              onClick={handleReadAloud}
              type="button"
              aria-label={speaking ? 'Stop audio' : 'Read scheme aloud'}
              className="p-1.5 rounded-lg text-muted hover:text-navy hover:bg-slate-100 transition-colors cursor-pointer"
              title={speaking ? 'Stop audio' : 'Read aloud'}
            >
              {speaking ? <VolumeX size={15} className="text-danger" /> : <Volume2 size={15} />}
            </button>
          </div>
        </div>

        {/* Title & Benefit */}
        <div>
          <h3 className="text-base sm:text-lg font-bold text-navy leading-snug">
            {title}
          </h3>
          <p className="text-sm font-semibold text-emerald-verified mt-1.5 flex items-start gap-1">
            <span className="shrink-0">✨</span>
            <span>{benefit}</span>
          </p>
        </div>

        {/* Almost Eligible Failure Rule & Actionable Hint */}
        {scheme.what_would_change_this && (
          <div className="bg-amber-tint/70 border border-amber-warn/40 rounded-xl p-3.5 text-xs text-navy space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-amber-warn">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{t.khoj.failedRule}: {scheme.failed_rule}</span>
            </div>
            <p className="text-navy/90 leading-relaxed">
              <span className="font-bold text-amber-warn">{t.khoj.whatWouldChange}: </span>
              {scheme.what_would_change_this}
            </p>
          </div>
        )}

        {/* Reason summary */}
        {scheme.reason && (
          <p className="text-xs text-muted bg-slate-50 border border-border rounded-xl p-3 leading-relaxed">
            {scheme.reason}
          </p>
        )}

        {/* Expandable Why you match */}
        {scheme.matched_reasons?.length > 0 && (
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowWhy(!showWhy)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-navy bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5 text-emerald-verified">
                <CheckCircle size={14} /> {t.khoj.whyMatch} ({scheme.matched_reasons.length})
              </span>
              {showWhy ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showWhy && (
              <ul className="p-3.5 space-y-1.5 bg-white text-xs text-muted border-t border-border">
                {scheme.matched_reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-verified font-bold shrink-0">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Expandable Still unknown */}
        {scheme.missing_info?.length > 0 && (
          <div className="border border-amber-warn/30 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowUnknown(!showUnknown)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-amber-warn bg-amber-tint/40 hover:bg-amber-tint/70 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle size={14} /> {t.khoj.stillUnknown} ({scheme.missing_info.length})
              </span>
              {showUnknown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showUnknown && (
              <ul className="p-3.5 space-y-1.5 bg-white text-xs text-muted border-t border-amber-warn/20">
                {scheme.missing_info.map((q, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-warn font-bold shrink-0">?</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Documents Checklist */}
        {scheme.documents?.length > 0 && (
          <DocumentChecklist documents={scheme.documents} />
        )}

        {/* Source Verification Badge & Last Verified Date */}
        <div className="space-y-1.5">
          <SourceBadge
            source_status={scheme.source_status}
            evidence={scheme.evidence}
          />
          <div className="flex items-center justify-between text-[11px] text-muted px-1">
            {scheme.source_url && (
              <a
                href={scheme.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-info hover:underline flex items-center gap-1 font-semibold"
              >
                <span>{t.khoj.sourceOfficialLink}</span>
                <ExternalLink size={11} />
              </a>
            )}
            {scheme.last_verified && (
              <span>{t.khoj.lastVerified}: {scheme.last_verified}</span>
            )}
          </div>
        </div>

        {/* Grounded Q&A per Scheme Toggle */}
        <div className="border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setShowQaBox(!showQaBox)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-navy bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5 text-info">
              <MessageCircle size={14} /> {t.khoj.askScheme}
            </span>
            {showQaBox ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showQaBox && (
            <div className="p-3.5 bg-white space-y-3 border-t border-border">
              <form onSubmit={handleAskQuestion} className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={t.khoj.askPlaceholder}
                  className="flex-1 text-xs border border-border rounded-xl px-3 py-2 outline-none focus-visible:outline-3 focus-visible:outline-saffron focus-visible:outline-offset-2"
                />
                <button
                  type="submit"
                  disabled={!question.trim() || qaLoading}
                  className="px-4 py-2 rounded-xl bg-saffron hover:bg-saffron-hover text-white font-semibold text-xs disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-all cursor-pointer shadow-xs"
                >
                  {qaLoading ? t.khoj.asking : t.khoj.askBtn}
                </button>
              </form>

              {qaAnswer && (
                <div className="bg-slate-50 border border-border rounded-xl p-3 text-xs text-navy space-y-1.5">
                  <p className="leading-relaxed">{qaAnswer.answer}</p>
                  {qaAnswer.source_url && (
                    <a
                      href={qaAnswer.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-info font-semibold hover:underline flex items-center gap-1 text-[11px] pt-1"
                    >
                      <span>Verify on official source</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="p-4 bg-slate-50/80 border-t border-border">
        <a
          href={scheme.apply_url || scheme.source_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs shadow-xs transition-all text-center min-h-[44px] ${
            timeline === 'active'
              ? 'bg-saffron hover:bg-saffron-hover text-white'
              : timeline === 'upcoming'
              ? 'bg-info hover:bg-blue-700 text-white'
              : 'bg-slate-200 hover:bg-slate-300 text-navy'
          }`}
        >
          <span>
            {timeline === 'active'
              ? t.khoj.applyNow
              : timeline === 'upcoming'
              ? 'View Advance Notification'
              : 'View Archive / Successor Scheme'}
          </span>
          <ExternalLink size={13} />
        </a>
      </div>
    </div>
  )
}
