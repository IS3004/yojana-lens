import { useState } from 'react'
import { CheckCircle2, XCircle, HelpCircle, Copy, Check, ExternalLink, ShieldCheck, AlertTriangle } from 'lucide-react'
import { useLang } from '../i18n/strings'

export default function VerdictCard({ result }) {
  const { t } = useLang()
  const [copied, setCopied] = useState(false)

  if (!result) return null

  const { verdict, confidence = 0, reasoning, citations = [] } = result

  const statusConfig = {
    supported: {
      bg: 'bg-surface border-emerald-verified/40',
      headerBg: 'bg-emerald-tint border-b border-emerald-verified/20',
      badge: 'bg-emerald-verified text-white',
      bar: 'bg-emerald-verified',
      icon: <CheckCircle2 size={24} className="text-emerald-verified shrink-0" />,
      label: t.parakh.verdictLabels.supported,
      textColor: 'text-emerald-verified',
    },
    false: {
      bg: 'bg-surface border-danger/40',
      headerBg: 'bg-danger-tint border-b border-danger/20',
      badge: 'bg-danger text-white',
      bar: 'bg-danger',
      icon: <XCircle size={24} className="text-danger shrink-0" />,
      label: t.parakh.verdictLabels.false,
      textColor: 'text-danger',
    },
    unverified: {
      bg: 'bg-surface border-border',
      headerBg: 'bg-slate-100 border-b border-border',
      badge: 'bg-muted text-white',
      bar: 'bg-muted',
      icon: <HelpCircle size={24} className="text-muted shrink-0" />,
      label: t.parakh.verdictLabels.unverified,
      textColor: 'text-muted',
    },
  }[verdict] || {
    bg: 'bg-surface border-border',
    headerBg: 'bg-slate-100 border-b border-border',
    badge: 'bg-muted text-white',
    bar: 'bg-muted',
    icon: <HelpCircle size={24} className="text-muted shrink-0" />,
    label: t.parakh.verdictLabels.unverified,
    textColor: 'text-muted',
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
    <div className={`rounded-2xl border shadow-card overflow-hidden transition-all ${statusConfig.bg}`}>
      {/* Verdict Header */}
      <div className={`p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${statusConfig.headerBg}`}>
        <div className="flex items-center gap-3">
          {statusConfig.icon}
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-muted block">
              Official Fact-Check Result
            </span>
            <h3 className={`text-lg font-bold leading-tight ${statusConfig.textColor}`}>
              {statusConfig.label}
            </h3>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-border text-navy shadow-2xs hover:bg-slate-50 transition-colors shrink-0 cursor-pointer focus-visible:outline-3 focus-visible:outline-saffron"
        >
          {copied ? <Check size={14} className="text-emerald-verified" /> : <Copy size={14} />}
          <span>{copied ? t.parakh.copied : t.parakh.copyExplainer}</span>
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Confidence Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-navy">
            <span>{t.parakh.confidence}</span>
            <span>{Math.round(confidence * 100)}%</span>
          </div>
          <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${statusConfig.bar}`}
              style={{ width: `${Math.round(confidence * 100)}%` }}
            />
          </div>
        </div>

        {/* Reasoning */}
        <div className="bg-slate-50/70 border border-border rounded-xl p-4 text-xs sm:text-sm text-navy leading-relaxed">
          <p className="font-bold text-navy mb-1.5 flex items-center gap-1.5">
            <ShieldCheck size={15} className="text-emerald-verified" />
            <span>Summary & Official Evidence:</span>
          </p>
          <p className="text-muted leading-relaxed">{reasoning}</p>
          {verdict === 'unverified' && (
            <p className="mt-2.5 text-muted/90 italic border-t border-border pt-2 text-xs">
              {t.parakh.unverifiedNote}
            </p>
          )}
        </div>

        {/* Citations */}
        {citations.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              {t.parakh.citations}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {citations.map((c, idx) => (
                <a
                  key={idx}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-white border border-border hover:border-info text-xs text-info font-medium transition-colors group shadow-2xs"
                >
                  <span className="truncate mr-2 text-navy font-semibold group-hover:text-info">{c.title}</span>
                  <ExternalLink size={13} className="shrink-0 text-muted group-hover:text-info" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Link Security Audit */}
        {result.link_flags && result.link_flags.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-border">
            <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-navy" />
              <span>{t.parakh.linkAudit || 'Domain Security Check'}</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {result.link_flags.map((item, i) => (
                <div
                  key={i}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    item.is_official
                      ? 'bg-emerald-tint text-emerald-verified border-emerald-verified/40'
                      : 'bg-danger-tint text-danger border-danger/40'
                  }`}
                >
                  <span>{item.is_official ? <CheckCircle2 size={13} className="text-emerald-verified shrink-0" /> : <AlertTriangle size={13} className="text-danger shrink-0" />}</span>
                  <span className="truncate max-w-[200px]" title={item.url}>{item.url}</span>
                  <span className="text-[10px] opacity-80">({item.reason})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
