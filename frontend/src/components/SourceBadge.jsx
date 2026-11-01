import { ShieldCheck, ShieldOff, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { useLang } from '../i18n/strings'

export default function SourceBadge({ source_status, evidence = [] }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const verified = source_status === 'verified'

  return (
    <div className={`rounded-lg border text-sm ${
      verified
        ? 'bg-green-50 border-green-200'
        : 'bg-slate-50 border-slate-200'
    }`}>
      <button
        onClick={() => verified && setOpen(!open)}
        className={`w-full flex items-center gap-2 px-3 py-2 ${verified ? 'cursor-pointer' : 'cursor-default'}`}
        disabled={!verified}
      >
        {verified
          ? <ShieldCheck size={15} className="text-green-600 shrink-0" />
          : <ShieldOff size={15} className="text-slate-400 shrink-0" />
        }
        <span className={`font-medium ${verified ? 'text-green-700' : 'text-slate-500'}`}>
          {verified ? t.source.verified : t.source.unverified}
        </span>
        {verified && evidence.length > 0 && (
          <span className="ml-auto text-green-500">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        )}
      </button>

      {verified && open && evidence.length > 0 && (
        <div className="border-t border-green-100 px-3 py-2 space-y-2">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">
            {t.source.evidence}
          </p>
          {evidence.map((ev, i) => (
            <div key={i} className="text-xs text-slate-600">
              <a
                href={ev.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:underline flex items-center gap-1"
              >
                {ev.title} <ExternalLink size={11} />
              </a>
              {ev.snippet && <p className="text-slate-500 mt-0.5">{ev.snippet}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
