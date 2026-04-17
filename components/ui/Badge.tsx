type BadgeVariant = 'green' | 'yellow' | 'red' | 'purple' | 'blue' | 'gray'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
}

const variants: Record<BadgeVariant, string> = {
  green:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  yellow: 'bg-amber-50   text-amber-700   border-amber-200',
  red:    'bg-rose-50    text-rose-700    border-rose-200',
  purple: 'bg-psi-50     text-psi-700     border-psi-200',
  blue:   'bg-sky-50     text-sky-700     border-sky-200',
  gray:   'bg-slate-50   text-slate-600   border-slate-200',
}

export function Badge({ variant = 'gray', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variants[variant]}`}
    >
      {children}
    </span>
  )
}
