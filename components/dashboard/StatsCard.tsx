import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string
  icon: LucideIcon
  iconColor: string
  iconBg: string
  subtext?: string
  subtextColor?: string
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  subtext,
  subtextColor = 'text-slate-500',
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          {subtext && (
            <p className={`text-xs mt-1 ${subtextColor}`}>{subtext}</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  )
}
