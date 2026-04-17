'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Session, Expense } from '@/types'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { Header } from '@/components/layout/Header'
import { formatCurrency, getMonthRange, calcNetValue, getMonthName } from '@/lib/utils'
import { DollarSign, TrendingUp, Users, CalendarDays, Receipt } from 'lucide-react'

interface PatientSummary {
  id: string
  name: string
  sessions: number
  total: number
  paid: number
  pending: number
}

export default function RelatoriosPage() {
  const supabase = createClient()
  const [sessions, setSessions] = useState<Session[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [chartData, setChartData] = useState<{ month: string; receita: number; liquido: number }[]>([])
  const [patientSummary, setPatientSummary] = useState<PatientSummary[]>([])
  const [loading, setLoading] = useState(true)

  const { start, end } = getMonthRange()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Sessões e despesas do mês
      const [{ data: s }, { data: e }] = await Promise.all([
        supabase
          .from('sessions')
          .select('*, patients(name), clinics(name, percentage)')
          .eq('user_id', user.id)
          .gte('date', start)
          .lte('date', end),
        supabase
          .from('expenses')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', start)
          .lte('date', end),
      ])

      const monthSessions = (s as Session[]) ?? []
      const monthExpenses = (e as Expense[]) ?? []

      setSessions(monthSessions)
      setExpenses(monthExpenses)

      // Resumo por paciente
      const byPatient: Record<string, PatientSummary> = {}
      for (const sess of monthSessions) {
        const pid = sess.patient_id
        const pName = (sess.patients as { name: string } | undefined)?.name ?? '—'
        if (!byPatient[pid]) {
          byPatient[pid] = { id: pid, name: pName, sessions: 0, total: 0, paid: 0, pending: 0 }
        }
        const price = Number(sess.price)
        byPatient[pid].sessions++
        byPatient[pid].total += price
        if (sess.is_paid) byPatient[pid].paid += price
        else byPatient[pid].pending += price
      }
      setPatientSummary(Object.values(byPatient).sort((a, b) => b.total - a.total))

      // Chart: últimos 6 meses
      const now = new Date()
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        return { year: d.getFullYear(), month: d.getMonth(), label: getMonthName(d.getMonth()) }
      })

      const chartItems = await Promise.all(
        months.map(async ({ year, month, label }) => {
          const ms = new Date(year, month, 1).toISOString().split('T')[0]
          const me = new Date(year, month + 1, 0).toISOString().split('T')[0]
          const { data } = await supabase
            .from('sessions')
            .select('price, clinics(percentage)')
            .eq('user_id', user.id)
            .gte('date', ms)
            .lte('date', me)
          const items = (data ?? []) as unknown as { price: number; clinics?: { percentage: number } | null }[]
          const receita = items.reduce((a, x) => a + Number(x.price), 0)
          const liquido = items.reduce((a, x) => a + calcNetValue(Number(x.price), x.clinics?.percentage ?? 0), 0)
          return { month: label, receita: Math.round(receita), liquido: Math.round(liquido) }
        })
      )
      setChartData(chartItems)
      setLoading(false)
    }
    load()
  }, [])

  const totalBruto = sessions.reduce((a, s) => a + Number(s.price), 0)
  const totalLiquido = sessions.reduce((a, s) => {
    const pct = (s.clinics as { percentage?: number } | null)?.percentage ?? 0
    return a + calcNetValue(Number(s.price), pct)
  }, 0)
  const totalPendente = sessions.filter((s) => !s.is_paid).reduce((a, s) => a + Number(s.price), 0)
  const totalDespesas = expenses.reduce((a, e) => a + Number(e.amount), 0)
  const resultado = totalLiquido - totalDespesas
  const uniquePatients = new Set(sessions.map((s) => s.patient_id)).size

  const currentMonth = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div>
      <Header
        title="Relatórios"
        subtitle={`Resumo financeiro — ${currentMonth}`}
      />

      {loading ? (
        <div className="text-center text-slate-400 text-sm py-10">Carregando...</div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Faturamento bruto', value: formatCurrency(totalBruto), icon: DollarSign, color: 'text-psi-600', bg: 'bg-psi-50' },
              { label: 'Faturamento líquido', value: formatCurrency(totalLiquido), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Pendente', value: formatCurrency(totalPendente), icon: CalendarDays, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Despesas', value: formatCurrency(totalDespesas), icon: Receipt, color: 'text-rose-600', bg: 'bg-rose-50' },
              { label: 'Resultado líquido', value: formatCurrency(resultado), icon: Users, color: resultado >= 0 ? 'text-emerald-600' : 'text-rose-600', bg: resultado >= 0 ? 'bg-emerald-50' : 'bg-rose-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Gráfico */}
          <div className="mb-6">
            <RevenueChart data={chartData} />
          </div>

          {/* Sessões por paciente */}
          {patientSummary.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">
                  Sessões por paciente — {currentMonth}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {uniquePatients} paciente{uniquePatients !== 1 ? 's' : ''} atendido{uniquePatients !== 1 ? 's' : ''}
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Paciente</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sessões</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Recebido</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Pendente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {patientSummary.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3 font-medium text-slate-800">{p.name}</td>
                      <td className="px-5 py-3 text-center text-slate-600">{p.sessions}</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-800">{formatCurrency(p.total)}</td>
                      <td className="px-5 py-3 text-right text-emerald-600 hidden md:table-cell">{formatCurrency(p.paid)}</td>
                      <td className="px-5 py-3 text-right hidden md:table-cell">
                        {p.pending > 0 ? (
                          <span className="text-amber-600 font-medium">{formatCurrency(p.pending)}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
