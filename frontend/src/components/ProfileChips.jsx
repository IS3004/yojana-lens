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
  { key: 'annual_income', label: () => 'Income',    format: (v) => v ? `₹${new Intl.NumberFormat('en-IN').format(v)}` : null },
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
      <span className="text-xs font-bold text-muted uppercase tracking-wider">
        {t.khoj.profileLabel}:
      </span>
      {chips.map(({ key, label, value }) => (
        <span
          key={key}
          className="inline-flex items-center gap-1.5 bg-saffron-tint/70 border border-saffron/30 text-navy text-xs px-3 py-1 rounded-full font-semibold transition-all shadow-2xs hover:border-saffron"
        >
          <span className="text-saffron font-bold">{label}:</span>
          <span>{value}</span>
          <button
            type="button"
            onClick={() => { onRemove(key); onRerun?.() }}
            className="ml-1 p-0.5 rounded-full hover:bg-saffron/20 text-muted hover:text-danger transition-colors cursor-pointer"
            aria-label={`Remove ${label}`}
          >
            <X size={13} />
          </button>
        </span>
      ))}
    </div>
  )
}
