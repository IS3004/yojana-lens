import { useState } from 'react'
import {
  ExternalLink, ChevronDown, ChevronUp, CheckCircle, HelpCircle,
  Clock, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, MessageCircle, Send
} from 'lucide-react'
import { useLang } from '../i18n/strings'
import SourceBadge from './SourceBadge'
import DocumentChecklist from './DocumentChecklist'
import client, { useMock } from '../api/client'

export default function SchemeCard({ scheme }) {
  const { lang, t } = useLang()
  const [showWhy, setShowWhy] = useState(false)
  const [showUnknown, setShowUnknown] = useState(false)

  // Grounded Q&A per scheme state
  const [question, setQuestion] = useState('')
  const [qaLoading, setQaLoading] = useState(false)
  const [qaAnswer, setQaAnswer] = useState(null)
  const [showQaBox, setShowQaBox] = useState(false)

  const isHi = lang === 'hi'
  const title = (isHi && scheme.scheme_hi) ? scheme.scheme_hi : scheme.scheme
  const benefit = (isHi && scheme.benefit_hi) ? scheme.benefit_hi : scheme.benefit
  const isLikely = scheme.status === 'likely_eligible'

  // Deadline calculation
  const computeDeadlines = (closesOn) => {
    if (!closesOn) return null
    try {
      const target = new Date(closesOn)
      const now = new Date()
      const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
      if (diffDays < 0) {
        return { text: isHi ? 'आवेदन समाप्त' : 'Closed', color: 'bg-slate-100 text-slate-600 border-slate-200' }
      }
      if (diffDays <= 7) {
        return {
          text: t.khoj.closesInDays?.replace('{n}', diffDays) || `Closes in ${diffDays} days`,
          color: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse'
        }
      }
      if (diffDays <= 30) {
        return {
          text: t.khoj.closesInDays?.replace('{n}', diffDays) || `Closes in ${diffDays} days`,
          color: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold'
        }
      }
      return {
        text: `Closes: ${closesOn}`,
        color: 'bg-slate-100 text-slate-700 border-slate-200'
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
      color: 'bg-emerald-100/80 text-emerald-800 border-emerald-300',
      dot: 'bg-emerald-500 animate-pulse',
      icon: <CheckCircle2 size={12} className="text-emerald-600" />
    },
    upcoming: {
      label: t.khoj.timelineStatus?.upcoming || 'Upcoming Soon',
      color: 'bg-blue-100/80 text-blue-800 border-blue-300',
      dot: 'bg-blue-500',
      icon: <Clock size={12} className="text-blue-600" />
    },
    ended: {
      label: t.khoj.timelineStatus?.ended || 'Closed / Ended',
      color: 'bg-slate-200 text-slate-700 border-slate-300',
      dot: 'bg-slate-400',
      icon: <XCircle size={12} className="text-slate-500" />
    }
  }[timeline] || {
    label: 'Available',
    color: 'bg-emerald-100/80 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-500',
    icon: <CheckCircle2 size={12} className="text-emerald-600" />
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

  return (
    <div className={`rounded-xl border transition-all flex flex-col justify-between overflow-hidden card-shadow ${
      timeline === 'ended' ? 'bg-slate-50/70 border-slate-300 opacity-90' : 'bg-white border-slate-200 hover:border-slate-300'
    }`}>
      <div className="p-5 space-y-4">
        {/* Timeline, Deadline & Status Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${timelineConfig.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${timelineConfig.dot}`} />
              {timelineConfig.label}
            </span>

            {/* Deadline badge (amber < 30 days, red < 7 days) */}
            {deadlineBadge && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${deadlineBadge.color}`}>
                <Clock size={11} />
                {deadlineBadge.text}
              </span>
            )}

            {/* Dates confirmed tag */}
            {scheme.dates_confirmed === false && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-800 border border-amber-200" title="Official timeline dates have not been locked by ministry circular">
                <AlertTriangle size={10} className="text-amber-600" />
                {t.khoj.datesNotConfirmed}
              </span>
            )}
          </div>

          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0 border ${
              isLikely
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {isLikely ? t.khoj.likelyEligible : t.khoj.checkAtOffice}
          </span>
        </div>

        {/* Title & Benefit */}
        <div>
          <h3 className="text-base font-bold text-slate-900 leading-snug">
            {title}
          </h3>
          <p className="text-sm font-semibold text-emerald-700 mt-1">
            ✨ {benefit}
          </p>
        </div>

        {/* Almost Eligible Failure Rule & Actionable Hint */}
        {scheme.what_would_change_this && (
          <div className="bg-amber-50/90 border border-amber-300 rounded-lg p-3 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1 text-amber-800">
              <AlertTriangle size={13} className="text-amber-600" />
              <span>{t.khoj.failedRule}: {scheme.failed_rule}</span>
            </div>
            <p className="text-slate-700 leading-relaxed">
              <span className="font-semibold text-amber-900">{t.khoj.whatWouldChange}: </span>
              {scheme.what_would_change_this}
            </p>
          </div>
        )}

        {/* Reason summary */}
        {scheme.reason && (
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2.5 leading-relaxed">
            {scheme.reason}
          </p>
        )}

        {/* Expandable Why you match */}
        {scheme.matched_reasons?.length > 0 && (
          <div className="border border-slate-100 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowWhy(!showWhy)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle size={14} /> {t.khoj.whyMatch} ({scheme.matched_reasons.length})
              </span>
              {showWhy ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showWhy && (
              <ul className="p-3 space-y-1 bg-white text-xs text-slate-600">
                {scheme.matched_reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Expandable Still unknown */}
        {scheme.missing_info?.length > 0 && (
          <div className="border border-amber-100 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowUnknown(!showUnknown)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50/50 hover:bg-amber-50 transition-colors"
            >
              <span className="flex items-center gap-1.5 text-amber-700">
                <HelpCircle size={14} /> {t.khoj.stillUnknown} ({scheme.missing_info.length})
              </span>
              {showUnknown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showUnknown && (
              <ul className="p-3 space-y-1 bg-white text-xs text-slate-600">
                {scheme.missing_info.map((q, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold">?</span>
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
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            {scheme.source_url && (
              <a
                href={scheme.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:underline flex items-center gap-1 font-medium"
              >
                <span>{t.khoj.sourceOfficialLink}</span>
                <ExternalLink size={10} />
              </a>
            )}
            {scheme.last_verified && (
              <span>{t.khoj.lastVerified}: {scheme.last_verified}</span>
            )}
          </div>
        </div>

        {/* Grounded Q&A per Scheme Toggle */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowQaBox(!showQaBox)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <span className="flex items-center gap-1.5 text-blue-700">
              <MessageCircle size={13} /> {t.khoj.askScheme}
            </span>
            {showQaBox ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showQaBox && (
            <div className="p-3 bg-white space-y-2.5">
              <form onSubmit={handleAskQuestion} className="flex gap-1.5">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={t.khoj.askPlaceholder}
                  className="flex-1 text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  disabled={!question.trim() || qaLoading}
                  className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs disabled:bg-slate-200 disabled:text-slate-400 shrink-0"
                >
                  {qaLoading ? t.khoj.asking : t.khoj.askBtn}
                </button>
              </form>

              {qaAnswer && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 space-y-1">
                  <p className="leading-relaxed">{qaAnswer.answer}</p>
                  {qaAnswer.source_url && (
                    <a
                      href={qaAnswer.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 font-semibold hover:underline flex items-center gap-1 text-[11px] pt-1"
                    >
                      <span>Verify on {qaAnswer.source_url}</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="p-4 bg-slate-50 border-t border-slate-100">
        <a
          href={scheme.apply_url || scheme.source_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg font-medium text-xs shadow-xs transition-colors text-center ${
            timeline === 'active'
              ? 'bg-orange-600 hover:bg-orange-700 text-white'
              : timeline === 'upcoming'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
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
