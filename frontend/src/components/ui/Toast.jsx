import { AlertCircle, X, RotateCcw } from 'lucide-react'

export default function Toast({
  message,
  onRetry = null,
  onClose = null,
  type = 'info',
  className = '',
}) {
  if (!message) return null

  const typeStyles = {
    info: 'bg-navy text-white border-navy/40',
    danger: 'bg-danger text-white border-red-700',
    warning: 'bg-amber-warn text-white border-amber-800',
    success: 'bg-emerald-verified text-white border-emerald-800',
  }[type] || 'bg-navy text-white'

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 flex items-center justify-between gap-3 p-4 rounded-xl shadow-lg border text-sm ${typeStyles} ${className}`}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <AlertCircle size={18} className="shrink-0" />
        <span className="leading-snug break-words">{message}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-semibold transition-colors"
          >
            <RotateCcw size={12} />
            <span>Retry</span>
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close notification"
            className="p-1 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
