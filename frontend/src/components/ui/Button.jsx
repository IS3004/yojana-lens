import { Loader2 } from 'lucide-react'

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  className = '',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all cursor-pointer select-none focus-visible:outline-3 focus-visible:outline-saffron focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'
  
  const sizeStyles = {
    sm: 'min-h-[38px] px-3.5 py-1.5 text-xs gap-1.5',
    md: 'min-h-[48px] px-5 py-2.5 text-sm gap-2',
    lg: 'min-h-[52px] px-6 py-3 text-base gap-2.5',
  }[size] || 'min-h-[48px] px-5 py-2.5 text-sm gap-2'

  const variantStyles = {
    primary: 'bg-saffron hover:bg-saffron-hover text-white shadow-xs active:scale-[0.99]',
    secondary: 'bg-transparent border border-navy text-navy hover:bg-navy/5 active:scale-[0.99]',
    danger: 'bg-danger hover:bg-red-700 text-white shadow-xs active:scale-[0.99]',
    outline: 'bg-white border border-border text-navy hover:bg-slate-50 shadow-2xs',
    ghost: 'bg-transparent text-navy hover:bg-slate-100',
  }[variant] || 'bg-saffron hover:bg-saffron-hover text-white shadow-xs'

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin shrink-0" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  )
}
