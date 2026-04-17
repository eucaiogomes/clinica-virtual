interface ProgressBarProps {
  value: number // 0–100
  color?: 'purple' | 'emerald' | 'amber' | 'rose'
  showLabel?: boolean
  height?: 'sm' | 'md'
}

const colors = {
  purple:  'bg-psi-500',
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',
  rose:    'bg-rose-500',
}

const heights = { sm: 'h-1.5', md: 'h-2.5' }

export function ProgressBar({
  value,
  color = 'purple',
  showLabel = false,
  height = 'md',
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-slate-100 rounded-full overflow-hidden ${heights[height]}`}>
        <div
          className={`${heights[height]} rounded-full transition-all duration-500 ${colors[color]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-slate-500 w-9 text-right">{Math.round(clamped)}%</span>
      )}
    </div>
  )
}
