import { AlertCircle } from 'lucide-react'
import { useLang } from '../i18n/strings'

export default function Disclaimer() {
  const { t } = useLang()

  return (
    <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5 my-4">
      <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
      <p className="leading-relaxed">{t.disclaimer}</p>
    </div>
  )
}
