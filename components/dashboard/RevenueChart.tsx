'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface MonthData {
  month: string
  receita: number
  liquido: number
}

interface RevenueChartProps {
  data: MonthData[]
}

function formatMoney(v: number) {
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`
  return `R$ ${v}`
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-4">
        Faturamento dos últimos 6 meses
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barSize={14} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatMoney}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip
            formatter={(v: number) =>
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
            }
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="receita" fill="#a78bfa" radius={[4, 4, 0, 0]} name="Bruto" />
          <Bar dataKey="liquido" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Líquido" />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3 justify-end">
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-2 rounded-sm bg-psi-300 inline-block" /> Bruto
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-2 rounded-sm bg-psi-600 inline-block" /> Líquido
        </span>
      </div>
    </div>
  )
}
