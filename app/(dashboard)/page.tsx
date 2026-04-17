'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Session, Goal } from '@/types'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { GoalCard } from '@/components/dashboard/GoalCard'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { DollarSign, Clock, TrendingUp, CalendarDays } from 'lucide-react'
import { formatCurrency, getMonthRange, getMonthName, calcNetValue } from '@/lib/utils'

export default function DashboardPage() {
  const supabase = createClient()

  const [sessions,  setSessions]  = useState<Session[]>([])
  const [goals,     setGoals]     = useState<Goal[]>([])
  const [chartData, setChartData] = useState<{ month: string; receita: number; liquido: number }[]>([])
  const [loading,   setLoading]   = useState(true)

  const { start, end } = getMonthRange()

  // ── Carrega todos os dados ──────────────────────────────────────────────
  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: monthSessions }, { data: goalsData }] = await Promise.all([
      supabase
        .from('sessions')
        .select('*, clinics(name, percentage)')
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end),
      supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ])

    setSessions((monthSessions as Session[]) ?? [])
    setGoals(goalsData ?? [])

    // Gráfico: últimos 6 meses
    const now    = new Date()
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      return { year: d.getFullYear(), month: d.getMonth(), label: getMonthName(d.getMonth()) }
    })

    const chartItems = await Promise.all(
      months.map(async ({ year, month, label }) => {
        const s = new Date(year, month, 1).toISOString().split('T')[0]
        const e = new Date(year, month + 1, 0).toISOString().split('T')[0]
        const { data } = await supabase
          .from('sessions')
          .select('price, clinic_id, clinics(percentage)')
          .eq('user_id', user.id)
          .gte('date', s)
          .lte('date', e)

        const items = (data ?? []) as unknown as { price: number; clinics?: { percentage: number } | null }[]
        const receita = items.reduce((a, x) => a + Number(x.price), 0)
        const liquido = items.reduce((a, x) => a + calcNetValue(Number(x.price), x.clinics?.percentage ?? 0), 0)
        return { month: label, receita: Math.round(receita), liquido: Math.round(liquido) }
      })
    )

    setChartData(chartItems)
    setLoading(false)
  }, [start, end]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carga inicial
  useEffect(() => { load() }, [load])

  // Realtime: recria sessão / marca como pago → atualiza dashboard automaticamente
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      channel = supabase
        .channel('dashboard-realtime')
        .on('postgres_changes', {
          event:  '*',
          schema: 'public',
          table:  'sessions',
          filter: `user_id=eq.${user.id}`,
        }, () => load())
        .subscribe()
    })

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [load]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cálculos derivados ─────────────────────────────────────────────────
  const faturamento   = sessions.reduce((a, s) => a + Number(s.price), 0)
  const pendente      = sessions.filter((s) => !s.is_paid).reduce((a, s) => a + Number(s.price), 0)
  const liquido       = sessions.reduce((a, s) => {
    const pct = (s.clinics as { percentage?: number } | null)?.percentage ?? 0
    return a + calcNetValue(Number(s.price), pct)
  }, 0)
  const uniquePatients = new Set(sessions.map((s) => s.patient_id)).size

  const today       = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const daysPassed  = Math.max(1, today.getDate())
  const previsao    = (faturamento / daysPassed) * daysInMonth

  function currentForGoal(goal: Goal): number {
    if (goal.type === 'revenue')  return faturamento
    if (goal.type === 'sessions') return sessions.length
    if (goal.type === 'patients') return uniquePatients
    return 0
  }

  const currentMonth = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5 capitalize">{currentMonth}</p>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Faturamento"
          value={loading ? '—' : formatCurrency(faturamento)}
          icon={DollarSign}
          iconBg="bg-psi-50"
          iconColor="text-psi-600"
          subtext={`Previsão: ${formatCurrency(previsao)}`}
        />
        <StatsCard
          title="Pendente"
          value={loading ? '—' : formatCurrency(pendente)}
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          subtext={pendente > 0 ? 'Aguardando pagamento' : 'Tudo recebido! ✓'}
          subtextColor={pendente > 0 ? 'text-amber-600' : 'text-emerald-600'}
        />
        <StatsCard
          title="Valor Líquido"
          value={loading ? '—' : formatCurrency(liquido)}
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          subtext="Após desconto das clínicas"
        />
        <StatsCard
          title="Sessões"
          value={loading ? '—' : String(sessions.length)}
          icon={CalendarDays}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          subtext={`${uniquePatients} paciente${uniquePatients !== 1 ? 's' : ''} ativo${uniquePatients !== 1 ? 's' : ''}`}
        />
      </div>

      {/* Gráfico + Metas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <RevenueChart data={chartData} />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Metas do mês</h3>
          {goals.length === 0 && !loading ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
              <p className="text-sm text-slate-400">Nenhuma meta cadastrada.</p>
              <a href="/metas" className="text-xs text-psi-600 hover:underline mt-1 block">
                Criar meta →
              </a>
            </div>
          ) : (
            goals.slice(0, 4).map((goal) => (
              <GoalCard key={goal.id} goal={goal} current={currentForGoal(goal)} />
            ))
          )}
        </div>
      </div>

      {/* Alerta sessões não pagas */}
      {sessions.filter((s) => !s.is_paid).length > 0 && (
        <div className="mt-5 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {sessions.filter((s) => !s.is_paid).length} sessão(ões) aguardando pagamento
            </p>
            <a href="/sessoes" className="text-xs text-amber-700 hover:underline">
              Ver sessões →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
