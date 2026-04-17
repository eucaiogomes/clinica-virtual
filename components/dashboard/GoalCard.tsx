import { Goal } from '@/types'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'

interface GoalCardProps {
  goal: Goal
  current: number
}

const goalLabels: Record<Goal['type'], string> = {
  revenue:  'Faturamento',
  patients: 'Pacientes',
  sessions: 'Sessões',
}

function getStatus(progress: number, end: string) {
  const isOverdue = new Date(end) < new Date()
  if (progress >= 100) return { label: 'Concluída', badge: 'green' as const }
  if (isOverdue)       return { label: 'Atrasada',  badge: 'red'   as const }
  return                      { label: 'Em andamento', badge: 'yellow' as const }
}

function formatTarget(type: Goal['type'], value: number) {
  return type === 'revenue' ? formatCurrency(value) : String(value)
}

export function GoalCard({ goal, current }: GoalCardProps) {
  const progress = Math.min(100, (current / goal.target) * 100)
  const status = getStatus(progress, goal.end_date)
  const color = progress >= 100 ? 'emerald' : status.label === 'Atrasada' ? 'rose' : 'purple'

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{goalLabels[goal.type]}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Meta: {formatTarget(goal.type, goal.target)}
          </p>
        </div>
        <Badge variant={status.badge}>{status.label}</Badge>
      </div>

      <ProgressBar value={progress} color={color} showLabel height="md" />

      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-slate-500">
          Atual: <strong className="text-slate-700">{formatTarget(goal.type, current)}</strong>
        </span>
        {progress >= 100 && (
          <span className="text-xs text-emerald-600 font-medium">Meta atingida!</span>
        )}
      </div>
    </div>
  )
}
