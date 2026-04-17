'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clinic } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Header } from '@/components/layout/Header'
import { Plus, Building2, Pencil, Trash2 } from 'lucide-react'

const emptyForm = { name: '', percentage: '' }

export default function ClinicasPage() {
  const supabase = createClient()
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('clinics')
      .select('*')
      .eq('user_id', user.id)
      .order('name')
    setClinics(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setForm(emptyForm)
    setEditId(null)
    setModal(true)
  }

  function openEdit(c: Clinic) {
    setForm({ name: c.name, percentage: String(c.percentage) })
    setEditId(c.id)
    setModal(true)
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = { name: form.name, percentage: Number(form.percentage) || 0 }

    if (editId) {
      await supabase.from('clinics').update(payload).eq('id', editId)
    } else {
      await supabase.from('clinics').insert({ ...payload, user_id: user.id })
    }

    setModal(false)
    setSaving(false)
    load()
  }

  async function remove(id: string) {
    await supabase.from('clinics').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  return (
    <div>
      <Header
        title="Clínicas / Terceirização"
        subtitle="Gerencie as clínicas parceiras e suas porcentagens"
        action={
          <Button onClick={openNew}>
            <Plus className="w-4 h-4" /> Nova clínica
          </Button>
        }
      />

      {loading ? (
        <div className="text-center text-slate-400 text-sm py-10">Carregando...</div>
      ) : clinics.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Nenhuma clínica cadastrada.</p>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre as clínicas onde você atende para calcular o valor líquido automaticamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clinics.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Desconto: <strong className="text-rose-600">{c.percentage}%</strong>
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1.5 rounded-lg hover:bg-psi-50 text-slate-400 hover:text-psi-600 transition"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleting(c.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 bg-slate-50 rounded-xl p-3 text-xs text-slate-600">
                Exemplo: sessão de R$ 200,00 →{' '}
                <strong className="text-emerald-700">
                  líquido R$ {(200 - 200 * c.percentage / 100).toFixed(2).replace('.', ',')}
                </strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: form */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editId ? 'Editar clínica' : 'Nova clínica'}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nome da clínica *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Clínica Sorrir"
          />
          <Input
            label="Porcentagem da clínica (%)"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={form.percentage}
            onChange={(e) => setForm({ ...form, percentage: e.target.value })}
            placeholder="Ex: 30"
          />
          <p className="text-xs text-slate-500">
            Esta porcentagem será descontada automaticamente do valor de cada sessão vinculada a esta clínica.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={save} loading={saving}>{editId ? 'Salvar' : 'Cadastrar'}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: delete */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Excluir clínica" size="sm">
        <p className="text-sm text-slate-600 mb-5">
          Tem certeza? As sessões vinculadas a esta clínica perderão o vínculo.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(null)}>Cancelar</Button>
          <Button variant="danger" onClick={() => deleting && remove(deleting)}>Excluir</Button>
        </div>
      </Modal>
    </div>
  )
}
