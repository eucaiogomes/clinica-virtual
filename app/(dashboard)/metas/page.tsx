'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Goal, Session } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { GoalCard } from '@/components/dashboard/GoalCard'
import { Header } from '@/components/layout/Header'
import { getMonthRange } from '@/lib/utils'
import { Plus, Target } from 'lucide-react'

const emptyForm = {
  type: 'revenue',
  target: '',
  start_date: getMonthRange().start,
  end_date: getMonthRange().end,
}

const typeOptions = [
  { value: 'revenue',  label: 'Faturamento (R$)' },
  { value: 'sessions', label: 'Número de sessões' },
  { value: 'patients', label: 'Número de pacientes' },
]

export default function MetasPage() {
  const supabase = createClient()
  const [goals, setGoals] = useState<Goal[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const { start, end } = getMonthRange()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: g }, { data: s }] = await Promise.all([
      supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('sessions').select('price, patient_id').eq('user_id', user.id).gte('date', start).lte('date', end),
    ])

    setGoals(g ?? [])
    setSessions((s as Session[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!form.target || !form.start_date || !form.end_date) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('goals').insert({
      user_id: user.id,
      type: form.type,
      target: Number(form.target),
      period: 'monthly',
      start_date: form.start_date,
      end_date: form.end_date,
    })

    setModal(false)
    setForm(emptyForm)
    setSaving(false)
    load()
  }

  async function remove(id: string) {
    await supabase.from('goals').delete().eq('id', id)
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }

  function currentForGoal(goal: Goal): number {
    const revenue = sessions.reduce((a, s) => a + Number(s.price), 0)
    const uniquePatients = new Set(sessions.map((s) => s.patient_id)).size
    if (goal.type === 'revenue')  return revenue
    if (goal.type === 'sessions') return sessions.length
    if (goal.type === 'patients') return uniquePatients
    return 0
  }

  const typeLabel: Record<string, string> = {
    revenue: 'Faturamento',
    sessions: 'Sessões',
    patients: 'Pacientes',
  }

  return (
    <div>
      <Header
        title="Metas"
        subtitle="Acompanhe seu progresso e celebre suas conquistas"
        action={
          <Button onClick={() => setModal(true)}>
            <Plus className="w-4 h-4" /> Nova meta
          </Button>
        }
      />

      {loading ? (
        <div className="text-center text-slate-400 text-sm py-10">Carregando...</div>
      ) : goals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <Target className="w-12 h-12 text-psi-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhuma meta cadastrada.</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
            Defina metas de faturamento, sessões ou pacientes para acompanhar seu crescimento.
          </p>
          <Button className="mt-4" onClick={() => setModal(true)}>
            <Plus className="w-4 h-4" /> Criar primeira meta
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <div key={goal.id} className="relative group">
              <GoalCard goal={goal} current={currentForGoal(goal)} />
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={() => remove(goal.id)}
                  className="text-xs text-slate-300 hover:text-rose-500 bg-white rounded-lg px-2 py-1 shadow-sm border border-slate-100 transition"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nova meta" size="sm">
        <div className="space-y-4">
          <Select
            label="Tipo de meta *"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {typeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>

          <Input
            label={`Meta (${typeLabel[form.type] ?? ''}) *`}
            type="number"
            min="0"
            step={form.type === 'revenue' ? '0.01' : '1'}
            value={form.target}
            onChange={(e) => setForm({ ...form, target: e.target.value })}
            placeholder={form.type === 'revenue' ? 'Ex: 5000.00' : 'Ex: 20'}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data início *"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
            <Input
              label="Data fim *"
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={save} loading={saving}>Criar meta</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
