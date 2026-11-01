import { X } from 'lucide-react'
import { useLang } from '../i18n/strings'

const CHIP_FIELDS = [
  { key: 'age',      label: (t) => t.chips.age,     format: (v) => `${v} yrs` },
  { key: 'gender',   label: (t) => t.chips.gender,  format: (v) => v },
  { key: 'state',    label: (t) => t.chips.state,   format: (v) => v },
  { key: 'category', label: (t) => t.chips.category, format: (v) => v?.toUpperCase() },
  { key: 'occupation', label: () => 'Occupation',   format: (v) => v },
  { key: 'is_rural', label: (t) => t.chips.rural,   format: (v) => v ? '✓' : null },
  { key: 'is_bpl',   label: (t) => t.chips.bpl,     format: (v) => v ? '✓' : null },
  { key: 'annual_income', label: () => 'Income',    format: (v) => v ? `₹${Number(v).toLocaleString('en-IN')}` : null },
]

export default function ProfileChips({ profile, onRemove, onRerun }) {
  const { t } = useLang()
  if (!profile) return null

  const chips = CHIP_FIELDS
    .filter(({ key }) => {
      const v = profile[key]
      return v !== null && v !== undefined && v !== false && v !== ''
    })
    .map(({ key, label, format }) => ({
      key,
      label: label(t),
      value: format(profile[key]),
    }))
    .filter(({ value }) => value !== null)

  if (!chips.length) return null

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {t.khoj.profileLabel}
      </span>
      {chips.map(({ key, label, value }) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-800 text-xs px-2.5 py-1 rounded-full font-medium"
        >
          <span className="text-orange-500">{label}:</span>
          {value}
          <button
            onClick={() => { onRemove(key); onRerun?.() }}
            className="ml-0.5 text-orange-400 hover:text-orange-700"
            aria-label={`Remove ${label}`}
          >
            <X size={11} />
          </button>
        </span>
      ))}
    </div>
  )
}
