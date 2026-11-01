export default function Card({
  children,
  stripe = null,
  variant = 'default',
  className = '',
  onClick = null,
  ...props
}) {
  const stripeColors = {
    emerald: 'border-t-4 border-t-emerald-verified',
    amber: 'border-t-4 border-t-amber-warn',
    danger: 'border-t-4 border-t-danger',
    info: 'border-t-4 border-t-info',
    saffron: 'border-t-4 border-t-saffron',
  }[stripe] || ''

  const variantStyles = {
    default: 'bg-surface border border-border shadow-card',
    almostEligible: 'bg-info-tint/20 border-2 border-dashed border-info/50 shadow-card',
    elevated: 'bg-surface border border-border shadow-md',
    interactive: 'bg-surface border border-border shadow-card hover:border-saffron/40 hover:shadow-md cursor-pointer transition-all',
  }[variant] || 'bg-surface border border-border shadow-card'

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-5 relative overflow-hidden transition-all ${variantStyles} ${stripeColors} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
