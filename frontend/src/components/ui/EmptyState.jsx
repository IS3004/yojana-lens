import { Search, RotateCcw } from 'lucide-react'

export default function EmptyState({
  icon = null,
  title,
  description = null,
  actionLabel = null,
  onAction = null,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white rounded-2xl border border-border shadow-card ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-amber-tint flex items-center justify-center text-amber-warn mb-4">
        {icon || <Search size={28} className="text-amber-warn" />}
      </div>
      <h3 className="text-base sm:text-lg font-bold text-navy mb-1.5">{title}</h3>
      {description && (
        <p className="text-xs sm:text-sm text-muted max-w-md mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-saffron hover:bg-saffron-hover text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs"
        >
          <RotateCcw size={14} />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  )
}
