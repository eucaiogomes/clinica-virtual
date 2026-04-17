'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Package, Patient } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Header } from '@/components/layout/Header'
import { formatCurrency } from '@/lib/utils'
import { Plus, PackageOpen, Minus } from 'lucide-react'

const emptyForm = { patient_id: '', total_sessions: '', total_price: '' }

export default function PacotesPage() {
  const supabase = createClient()
  const [packages, setPackages] = useState<Package[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: pkg }, { data: pat }] = await Promise.all([
      supabase
        .from('packages')
        .select('*, patients(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('patients').select('id, name').eq('user_id', user.id).order('name'),
    ])

    setPackages((pkg as Package[]) ?? [])
    setPatients((pat as Patient[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!form.patient_id || !form.total_sessions || !form.total_price) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('packages').insert({
      user_id: user.id,
      patient_id: form.patient_id,
      total_sessions: Number(form.total_sessions),
      used_sessions: 0,
      total_price: Number(form.total_price),
    })

    setModal(false)
    setForm(emptyForm)
    setSaving(false)
    load()
  }

  async function updateUsed(pkg: Package, delta: number) {
    const newVal = Math.min(pkg.total_sessions, Math.max(0, pkg.used_sessions + delta))
    await supabase.from('packages').update({ used_sessions: newVal }).eq('id', pkg.id)
    setPackages((prev) =>
      prev.map((p) => (p.id === pkg.id ? { ...p, used_sessions: newVal } : p))
    )
  }

  async function remove(id: string) {
    await supabase.from('packages').delete().eq('id', id)
    setPackages((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div>
      <Header
        title="Pacotes de Sessões"
        subtitle="Controle de sessões pré-pagas"
        action={
          <Button onClick={() => setModal(true)}>
            <Plus className="w-4 h-4" /> Novo pacote
          </Button>
        }
      />

      {loading ? (
        <div className="text-center text-slate-400 text-sm py-10">Carregando...</div>
      ) : packages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
          <PackageOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Nenhum pacote cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => {
            const remaining = pkg.total_sessions - pkg.used_sessions
            const progress = (pkg.used_sessions / pkg.total_sessions) * 100
            const isDone = remaining === 0
            const pricePerSession = pkg.total_price / pkg.total_sessions

            return (
              <div
                key={pkg.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 ${
                  isDone ? 'border-emerald-200' : 'border-slate-100'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {(pkg.patients as { name: string } | undefined)?.name ?? '—'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatCurrency(pkg.total_price)} •{' '}
                      {formatCurrency(pricePerSession)}/sessão
                    </p>
                  </div>
                  {isDone && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                      Concluído
                    </span>
                  )}
                </div>

                <ProgressBar value={progress} color={isDone ? 'emerald' : 'purple'} showLabel height="md" />

                <div className="flex justify-between text-sm mt-3">
                  <span className="text-slate-500">
                    Usadas: <strong className="text-slate-800">{pkg.used_sessions}</strong>
                  </span>
                  <span className="text-slate-500">
                    Restantes: <strong className={isDone ? 'text-emerald-600' : 'text-psi-700'}>{remaining}</strong>
                  </span>
                  <span className="text-slate-500">
                    Total: <strong>{pkg.total_sessions}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => updateUsed(pkg, -1)}
                    disabled={pkg.used_sessions === 0}
                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 transition"
                  >
                    <Minus className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <span className="text-xs text-slate-500 flex-1 text-center">
                    Registrar uso
                  </span>
                  <button
                    onClick={() => updateUsed(pkg, 1)}
                    disabled={isDone}
                    className="w-8 h-8 rounded-lg border border-psi-200 bg-psi-50 flex items-center justify-center hover:bg-psi-100 disabled:opacity-30 transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-psi-600" />
                  </button>
                  <button
                    onClick={() => remove(pkg.id)}
                    className="ml-2 text-xs text-slate-300 hover:text-rose-500 transition"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Novo pacote" size="sm">
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
              label="Nº de sessões *"
              type="number"
              min="1"
              value={form.total_sessions}
              onChange={(e) => setForm({ ...form, total_sessions: e.target.value })}
              placeholder="Ex: 10"
            />
            <Input
              label="Valor total (R$) *"
              type="number"
              step="0.01"
              min="0"
              value={form.total_price}
              onChange={(e) => setForm({ ...form, total_price: e.target.value })}
              placeholder="0,00"
            />
          </div>

          {form.total_sessions && form.total_price && Number(form.total_sessions) > 0 && (
            <div className="bg-psi-50 border border-psi-200 rounded-xl p-3 text-sm text-psi-700">
              Valor por sessão:{' '}
              <strong>{formatCurrency(Number(form.total_price) / Number(form.total_sessions))}</strong>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={save} loading={saving}>Criar pacote</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
