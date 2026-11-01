import {
  ShieldCheck, ShieldOff, CheckCircle2, HelpCircle,
  Lightbulb, AlertTriangle, Clock, AlertCircle
} from 'lucide-react'

export default function Badge({
  variant = 'verified',
  children,
  icon = null,
  className = '',
  days = null,
  ...props
}) {
  const configs = {
    verified: {
      bg: 'bg-emerald-tint text-emerald-verified border-emerald-verified/30',
      icon: <ShieldCheck size={13} className="shrink-0 text-emerald-verified" />,
      label: 'Verified',
    },
    unverified: {
      bg: 'bg-slate-100 text-muted border-border',
      icon: <ShieldOff size={13} className="shrink-0 text-muted" />,
      label: 'Unverified',
    },
    likelyEligible: {
      bg: 'bg-emerald-tint text-emerald-verified border-emerald-verified/30',
      icon: <CheckCircle2 size={13} className="shrink-0 text-emerald-verified" />,
      label: 'Likely eligible',
    },
    checkAtOffice: {
      bg: 'bg-amber-tint text-amber-warn border-amber-warn/30',
      icon: <HelpCircle size={13} className="shrink-0 text-amber-warn" />,
      label: 'Check at office',
    },
    almostEligible: {
      bg: 'bg-info-tint text-info border-info/30',
      icon: <Lightbulb size={13} className="shrink-0 text-info" />,
      label: 'Almost eligible',
    },
    overdue: {
      bg: 'bg-danger-tint text-danger border-danger/30 font-bold',
      icon: <AlertTriangle size={13} className="shrink-0 text-danger" />,
      label: 'Overdue, escalate',
    },
    closesSoon: {
      bg: (days !== null && days <= 7)
        ? 'bg-danger-tint text-danger border-danger/40 font-bold'
        : 'bg-amber-tint text-amber-warn border-amber-warn/40 font-semibold',
      icon: <Clock size={13} className="shrink-0" />,
      label: 'Closes soon',
    },
    severity_low: {
      bg: 'bg-emerald-tint text-emerald-verified border-emerald-verified/30',
      icon: <CheckCircle2 size={13} className="shrink-0" />,
      label: 'Low Severity',
    },
    severity_medium: {
      bg: 'bg-amber-tint text-amber-warn border-amber-warn/30',
      icon: <AlertCircle size={13} className="shrink-0" />,
      label: 'Medium Severity',
    },
    severity_high: {
      bg: 'bg-danger-tint text-danger border-danger/30 font-bold',
      icon: <AlertTriangle size={13} className="shrink-0" />,
      label: 'High Severity',
    },
  }

  const current = configs[variant] || configs.verified

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${current.bg} ${className}`}
      {...props}
    >
      {icon || current.icon}
      <span>{children || current.label}</span>
    </span>
  )
}
