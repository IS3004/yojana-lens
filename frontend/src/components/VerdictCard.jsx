import { useState } from 'react'
import { CheckCircle2, XCircle, HelpCircle, Copy, Check, ExternalLink } from 'lucide-react'
import { useLang } from '../i18n/strings'

export default function VerdictCard({ result }) {
  const { t } = useLang()
  const [copied, setCopied] = useState(false)

  if (!result) return null

  const { verdict, confidence = 0, reasoning, citations = [] } = result

  const statusConfig = {
    supported: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      badge: 'bg-emerald-600 text-white',
      bar: 'bg-emerald-600',
      icon: <CheckCircle2 size={24} className="text-emerald-600" />,
      label: t.parakh.verdictLabels.supported,
    },
    false: {
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      badge: 'bg-rose-600 text-white',
      bar: 'bg-rose-600',
      icon: <XCircle size={24} className="text-rose-600" />,
      label: t.parakh.verdictLabels.false,
    },
    unverified: {
      bg: 'bg-slate-50 border-slate-200 text-slate-800',
      badge: 'bg-slate-600 text-white',
      bar: 'bg-slate-600',
      icon: <HelpCircle size={24} className="text-slate-500" />,
      label: t.parakh.verdictLabels.unverified,
    },
  }[verdict] || {
    bg: 'bg-slate-50 border-slate-200 text-slate-800',
    badge: 'bg-slate-600 text-white',
    bar: 'bg-slate-600',
    icon: <HelpCircle size={24} className="text-slate-500" />,
    label: t.parakh.verdictLabels.unverified,
  }

  const handleCopy = () => {
    const citationText = citations.length
      ? `\nSources:\n` + citations.map((c) => `- ${c.title}: ${c.url}`).join('\n')
      : ''
    const explainer = `[YojanaLens Fact-Check Verdict: ${statusConfig.label.toUpperCase()}]\nConfidence: ${(confidence * 100).toFixed(0)}%\n\n${reasoning}${citationText}\n\nCheck official facts on pib.gov.in`

    navigator.clipboard.writeText(explainer)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`rounded-2xl border p-6 card-shadow space-y-5 ${statusConfig.bg}`}>
      {/* Verdict Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {statusConfig.icon}
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
              Analysis Verdict
            </span>
            <h3 className="text-lg font-bold leading-tight">
              {statusConfig.label}
            </h3>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 shadow-xs hover:bg-slate-50 transition-colors shrink-0"
        >
          {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
          <span>{copied ? t.parakh.copied : t.parakh.copyExplainer}</span>
        </button>
      </div>

      {/* Confidence Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold">
          <span>{t.parakh.confidence}</span>
          <span>{Math.round(confidence * 100)}%</span>
        </div>
        <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${statusConfig.bar}`}
            style={{ width: `${Math.round(confidence * 100)}%` }}
          />
        </div>
      </div>

      {/* Reasoning */}
      <div className="bg-white/90 border border-slate-200/60 rounded-xl p-4 text-xs sm:text-sm text-slate-700 leading-relaxed shadow-2xs">
        <p className="font-medium text-slate-900 mb-1">Summary & Evidence:</p>
        <p>{reasoning}</p>
        {verdict === 'unverified' && (
          <p className="mt-2 text-slate-500 italic border-t border-slate-100 pt-2">
            {t.parakh.unverifiedNote}
          </p>
        )}
      </div>

      {/* Citations */}
      {citations.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t.parakh.citations}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {citations.map((c, idx) => (
              <a
                key={idx}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs text-blue-700 font-medium transition-colors group shadow-2xs"
              >
                <span className="truncate mr-2">{c.title}</span>
                <ExternalLink size={13} className="shrink-0 text-slate-400 group-hover:text-blue-600" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Link Security Audit (Phase 2b - red/green chips) */}
      {result.link_flags && result.link_flags.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-200/60">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <span>🛡️</span> {t.parakh.linkAudit || 'Link Security Check'}
          </span>
          <div className="flex flex-wrap gap-2">
            {result.link_flags.map((item, i) => (
              <div
                key={i}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                  item.is_official
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                <span>{item.is_official ? '🟢' : '🔴'}</span>
                <span className="truncate max-w-[200px]" title={item.url}>{item.url}</span>
                <span className="text-[10px] opacity-80">({item.reason})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
