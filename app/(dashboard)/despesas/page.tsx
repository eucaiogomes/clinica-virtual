'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Expense } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Header } from '@/components/layout/Header'
import { formatCurrency, formatDate, getMonthRange } from '@/lib/utils'
import { Plus, Trash2, Receipt } from 'lucide-react'

const emptyForm = {
  description: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
}

export default function DespesasPage() {
  const supabase = createClient()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const { start: defaultStart, end: defaultEnd } = getMonthRange()
  const [filterStart, setFilterStart] = useState(defaultStart)
  const [filterEnd, setFilterEnd] = useState(defaultEnd)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', filterStart)
      .lte('date', filterEnd)
      .order('date', { ascending: false })
    setExpenses(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filterStart, filterEnd])

  async function save() {
    if (!form.description.trim() || !form.amount) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('expenses').insert({
      user_id: user.id,
      description: form.description,
      amount: Number(form.amount),
      date: form.date,
    })

    setModal(false)
    setForm(emptyForm)
    setSaving(false)
    load()
  }

  async function remove(id: string) {
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  const total = expenses.reduce((a, e) => a + Number(e.amount), 0)

  return (
    <div>
      <Header
        title="Despesas"
        subtitle="Registre seus gastos profissionais"
        action={
          <Button onClick={() => setModal(true)}>
            <Plus className="w-4 h-4" /> Nova despesa
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm">
          <input
            type="date"
            value={filterStart}
            onChange={(e) => setFilterStart(e.target.value)}
            className="border-0 text-sm focus:outline-none text-slate-600"
          />
          <span className="text-slate-300">→</span>
          <input
            type="date"
            value={filterEnd}
            onChange={(e) => setFilterEnd(e.target.value)}
            className="border-0 text-sm focus:outline-none text-slate-600"
          />
        </div>

        {expenses.length > 0 && (
          <div className="ml-auto bg-rose-50 border border-rose-200 rounded-xl px-4 py-2 text-sm text-rose-700 font-medium">
            Total: {formatCurrency(total)}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Carregando...</div>
        ) : expenses.length === 0 ? (
          <div className="p-10 text-center">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Nenhuma despesa no período.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Descrição</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
                <th className="px-5 py-3.5 w-14" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{formatDate(e.date)}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-800">{e.description}</td>
                  <td className="px-5 py-3.5 text-right font-medium text-rose-600">
                    {formatCurrency(Number(e.amount))}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => remove(e.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-100 bg-slate-50">
                <td colSpan={2} className="px-5 py-3 text-xs font-semibold text-slate-600">
                  Total no período
                </td>
                <td className="px-5 py-3 text-right font-bold text-rose-600 text-sm">
                  {formatCurrency(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nova despesa" size="sm">
        <div className="space-y-4">
          <Input
            label="Descrição *"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Ex: Assinatura de plataforma, aluguel de sala..."
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Valor (R$) *"
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0,00"
            />
            <Input
              label="Data *"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={save} loading={saving}>Registrar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
