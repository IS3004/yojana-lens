import { AlertCircle } from 'lucide-react'
import { useLang } from '../../i18n/strings'

export default function DisclaimerBar({ className = '' }) {
  const { t } = useLang()

  return (
    <div
      role="note"
      aria-label="Disclaimer"
      className={`bg-amber-tint border border-amber-warn/30 text-amber-warn rounded-xl p-3.5 text-xs flex items-start gap-2.5 my-3 ${className}`}
    >
      <AlertCircle size={16} className="text-amber-warn shrink-0 mt-0.5" />
      <p className="leading-relaxed font-medium">
        {t.disclaimer || 'Prototype for information only. Not affiliated with any government portal.'}
      </p>
    </div>
  )
}
