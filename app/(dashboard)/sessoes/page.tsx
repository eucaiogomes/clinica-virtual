'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Session, Patient, Clinic } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Header } from '@/components/layout/Header'
import { formatCurrency, formatDate, getMonthRange, calcNetValue } from '@/lib/utils'
import { Plus, CheckCircle2, Circle, Filter, CreditCard, Video, Loader2 as Spin } from 'lucide-react'

const emptyForm = {
  patient_id: '',
  clinic_id: '',
  date: new Date().toISOString().split('T')[0],
  price: '',
  type: 'particular',
  payment_method: '',
}

const typeLabels: Record<string, string> = {
  particular: 'Particular',
  convenio: 'Convênio',
  terceirizado: 'Terceirizado',
}

export default function SessoesPage() {
  const supabase = createClient()
  const [sessions, setSessions] = useState<Session[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [sending, setSendingAction] = useState<string | null>(null)

  async function sendPayment(sessionId: string) {
    setSendingAction(`pay-${sessionId}`)
    const res = await fetch('/api/send-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
    const data = await res.json()
    if (data.error) alert(`Erro: ${data.error}`)
    else alert(`✓ Cobrança enviada para ${data.patient}!`)
    setSendingAction(null)
  }

  async function sendMeet(sessionId: string) {
    setSendingAction(`meet-${sessionId}`)
    const res = await fetch('/api/send-meet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
    const data = await res.json()
    if (data.error) alert(`Erro: ${data.error}`)
    else alert(`✓ Link do Meet enviado para ${data.patient}!\n${data.meetLink}`)
    setSendingAction(null)
  }

  const { start: defaultStart, end: defaultEnd } = getMonthRange()
  const [filterStart, setFilterStart] = useState(defaultStart)
  const [filterEnd, setFilterEnd] = useState(defaultEnd)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: s }, { data: p }, { data: c }] = await Promise.all([
      supabase
        .from('sessions')
        .select('*, patients(name), clinics(name, percentage)')
        .eq('user_id', user.id)
        .gte('date', filterStart)
        .lte('date', filterEnd)
        .order('date', { ascending: false }),
      supabase.from('patients').select('id, name').eq('user_id', user.id).order('name'),
      supabase.from('clinics').select('id, name, percentage').eq('user_id', user.id).order('name'),
    ])

    setSessions((s as Session[]) ?? [])
    setPatients((p as Patient[]) ?? [])
    setClinics((c as Clinic[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filterStart, filterEnd])

  function openNew() {
    setForm(emptyForm)
    setModal(true)
  }

  async function save() {
    if (!form.patient_id || !form.date || !form.price) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('sessions').insert({
      user_id: user.id,
      patient_id: form.patient_id,
      clinic_id: form.clinic_id || null,
      date: form.date,
      price: Number(form.price),
      type: form.type,
      is_paid: false,
      payment_method: form.payment_method,
    })

    setModal(false)
    setSaving(false)
    load()
  }

  async function togglePaid(s: Session) {
    await supabase.from('sessions').update({ is_paid: !s.is_paid }).eq('id', s.id)
    setSessions((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, is_paid: !x.is_paid } : x))
    )
  }

  async function remove(id: string) {
    await supabase.from('sessions').delete().eq('id', id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }

  const totalBruto = sessions.reduce((a, s) => a + Number(s.price), 0)
  const totalLiquido = sessions.reduce((a, s) => {
    const pct = (s.clinics as { percentage?: number } | null)?.percentage ?? 0
    return a + calcNetValue(Number(s.price), pct)
  }, 0)
  const totalPendente = sessions.filter((s) => !s.is_paid).reduce((a, s) => a + Number(s.price), 0)

  const selectedClinic = clinics.find((c) => c.id === form.clinic_id)
  const netPreview = form.price
    ? calcNetValue(Number(form.price), selectedClinic?.percentage ?? 0)
    : null

  return (
    <div>
      <Header
        title="Sessões"
        subtitle={`${sessions.length} sessão(ões) no período`}
        action={
          <Button onClick={openNew}>
            <Plus className="w-4 h-4" /> Nova sessão
          </Button>
        }
      />

      {/* Filtros + resumo */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
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

        <div className="flex gap-3 ml-auto text-sm">
          <span className="text-slate-500">
            Bruto: <strong className="text-slate-800">{formatCurrency(totalBruto)}</strong>
          </span>
          <span className="text-slate-500">
            Líquido: <strong className="text-emerald-700">{formatCurrency(totalLiquido)}</strong>
          </span>
          {totalPendente > 0 && (
            <span className="text-amber-600 font-medium">
              Pendente: {formatCurrency(totalPendente)}
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Carregando...</div>
        ) : sessions.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            Nenhuma sessão no período selecionado.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pago</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Paciente</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Tipo</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Clínica</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Líquido</th>
                <th className="px-5 py-3.5 w-14" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sessions.map((s) => {
                const pct = (s.clinics as { percentage?: number } | null)?.percentage ?? 0
                const net = calcNetValue(Number(s.price), pct)
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3.5">
                      <button onClick={() => togglePaid(s)}>
                        {s.is_paid ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 hover:text-amber-400 transition" />
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{formatDate(s.date)}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      {(s.patients as { name: string } | undefined)?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <Badge
                        variant={
                          s.type === 'particular' ? 'purple'
                          : s.type === 'convenio'   ? 'blue'
                          : 'gray'
                        }
                      >
                        {typeLabels[s.type] ?? s.type}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs hidden lg:table-cell">
                      {(s.clinics as { name: string } | null)?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-800">
                      {formatCurrency(Number(s.price))}
                    </td>
                    <td className="px-5 py-3.5 text-right text-emerald-700 text-xs hidden md:table-cell">
                      {formatCurrency(net)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          title="Enviar cobrança Pix"
                          onClick={() => sendPayment(s.id)}
                          disabled={sending === `pay-${s.id}`}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-300 hover:text-emerald-600 transition disabled:opacity-40"
                        >
                          {sending === `pay-${s.id}` ? <Spin className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          title="Enviar link do Meet"
                          onClick={() => sendMeet(s.id)}
                          disabled={sending === `meet-${s.id}`}
                          className="p-1.5 rounded-lg hover:bg-sky-50 text-slate-300 hover:text-sky-600 transition disabled:opacity-40"
                        >
                          {sending === `meet-${s.id}` ? <Spin className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => remove(s.id)}
                          className="p-1.5 text-xs text-slate-300 hover:text-rose-500 transition"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nova sessão">
        <div className="space-y-4">
          <Select
            label="Paciente *"
            value={form.patient_id}
            onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
          >
            <option value="">Selecione...</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data *"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <Input
              label="Valor (R$) *"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="0,00"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tipo"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="particular">Particular</option>
              <option value="convenio">Convênio</option>
              <option value="terceirizado">Terceirizado</option>
            </Select>
            <Select
              label="Clínica (opcional)"
              value={form.clinic_id}
              onChange={(e) => setForm({ ...form, clinic_id: e.target.value })}
            >
              <option value="">Nenhuma</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.percentage}%)</option>
              ))}
            </Select>
          </div>

          <Input
            label="Forma de pagamento"
            value={form.payment_method}
            onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
            placeholder="Pix, cartão, dinheiro..."
          />

          {netPreview !== null && selectedClinic && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm">
              <span className="text-emerald-700">
                Valor líquido após {selectedClinic.percentage}% da clínica:{' '}
                <strong>{formatCurrency(netPreview)}</strong>
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={save} loading={saving}>Salvar sessão</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
