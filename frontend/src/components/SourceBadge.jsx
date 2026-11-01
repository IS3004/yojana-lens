import { ShieldCheck, ShieldOff, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { useLang } from '../i18n/strings'

export default function SourceBadge({ source_status, evidence = [] }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const verified = source_status === 'verified'

  return (
    <div className={`rounded-xl border text-sm transition-all ${
      verified
        ? 'bg-emerald-tint/60 border-emerald-verified/30'
        : 'bg-slate-50 border-border'
    }`}>
      <button
        onClick={() => verified && setOpen(!open)}
        className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-left rounded-xl ${verified ? 'cursor-pointer hover:bg-emerald-tint/80' : 'cursor-default'}`}
        disabled={!verified}
        aria-expanded={verified ? open : undefined}
      >
        {verified
          ? <ShieldCheck size={16} className="text-emerald-verified shrink-0" />
          : <ShieldOff size={16} className="text-muted shrink-0" />
        }
        <span className={`font-semibold text-xs sm:text-sm ${verified ? 'text-emerald-verified' : 'text-muted'}`}>
          {verified ? t.source.verified : t.source.unverified}
        </span>
        {verified && evidence.length > 0 && (
          <span className="ml-auto text-emerald-verified/70">
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </span>
        )}
      </button>

      {verified && open && evidence.length > 0 && (
        <div className="border-t border-emerald-verified/20 px-3.5 py-3 space-y-2.5 bg-white/60 rounded-b-xl">
          <p className="text-[11px] font-bold text-emerald-verified uppercase tracking-wider">
            {t.source.evidence}
          </p>
          {evidence.map((ev, i) => (
            <div key={i} className="text-xs text-navy/80">
              <a
                href={ev.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-info hover:underline inline-flex items-center gap-1"
              >
                <span>{ev.title}</span>
                <ExternalLink size={12} className="shrink-0" />
              </a>
              {ev.snippet && <p className="text-muted mt-0.5 leading-relaxed">{ev.snippet}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
