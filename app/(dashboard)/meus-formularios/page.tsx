'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import type { ProfessionalForm } from '@/types'
import { Copy, Check, ExternalLink, MessageSquare, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Modal } from '@/components/ui/Modal'

export default function MeusFormulariosPage() {
  const supabase = createClient()
  const [forms, setForms] = useState<(ProfessionalForm & { response_count: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('professional_forms')
      .select('*, templates(title, category, duration_minutes)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!data) { setLoading(false); return }

    const withCounts = await Promise.all(
      data.map(async (form) => {
        const { count } = await supabase
          .from('responses')
          .select('id', { count: 'exact', head: true })
          .eq('professional_form_id', form.id)
        return { ...form, response_count: count ?? 0 }
      })
    )

    setForms(withCounts as any)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function copyLink(slug: string) {
    const url = `${window.location.origin}/f/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(null), 2000)
  }

  async function deleteForm(id: string) {
    await supabase.from('professional_forms').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  const categoryColors: Record<string, string> = {
    'Ciclos e Encerramento': 'bg-orange-100 text-orange-700',
    'Bem-estar Emocional':   'bg-emerald-100 text-emerald-700',
    'Autoestima e Limites':  'bg-amber-100 text-amber-700',
  }

  return (
    <div>
      <Header
        title="Meus Formulários"
        subtitle={`${forms.length} formulário${forms.length !== 1 ? 's' : ''} gerado${forms.length !== 1 ? 's' : ''}`}
        action={
          <Button onClick={() => window.location.href = '/exercicios'}>
            + Novo formulário
          </Button>
        }
      />

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Carregando...</div>
      ) : forms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <p className="text-4xl mb-4">🌿</p>
          <p className="font-semibold text-slate-700 mb-2">Nenhum formulário ainda</p>
          <p className="text-sm text-slate-400 mb-6">
            Acesse Exercícios Terapêuticos, escolha um exercício e gere seu link personalizado.
          </p>
          <Button onClick={() => window.location.href = '/exercicios'}>
            Ver exercícios disponíveis
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {forms.map(form => (
            <div
              key={form.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
            >
              <div className="flex items-start gap-4">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${categoryColors[(form.templates as any)?.category ?? ''] ?? 'bg-slate-100 text-slate-500'}`}>
                      {(form.templates as any)?.category ?? 'Exercício'}
                    </span>
                    <span className="text-xs text-slate-400">
                      Criado em {formatDate(form.created_at.split('T')[0])}
                    </span>
                  </div>

                  <h3 className="font-semibold text-slate-800 text-sm leading-snug mb-2">
                    {(form.templates as any)?.title}
                  </h3>

                  {/* Link row */}
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 text-xs mb-3 max-w-md">
                    <span className="text-slate-500 truncate font-mono flex-1">
                      {window.location.origin}/f/{form.slug}
                    </span>
                    <button
                      onClick={() => copyLink(form.slug)}
                      className="flex items-center gap-1 text-psi-600 hover:text-psi-700 shrink-0 font-medium"
                    >
                      {copiedSlug === form.slug
                        ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copiado!</>
                        : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
                    </button>
                  </div>

                  {/* Stats + actions */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MessageSquare className="w-3.5 h-3.5 text-psi-400" />
                      <strong className="text-slate-700">{form.response_count}</strong> {form.response_count === 1 ? 'resposta' : 'respostas'}
                    </span>

                    {form.response_count > 0 && (
                      <Link
                        href={`/meus-formularios/${form.id}`}
                        className="text-xs text-psi-600 hover:text-psi-700 font-medium underline-offset-2 hover:underline"
                      >
                        Ver respostas →
                      </Link>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 shrink-0">
                  <a
                    href={`/f/${form.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg text-slate-400 hover:text-psi-600 hover:bg-psi-50 transition"
                    title="Abrir formulário"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setDeleting(form.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Excluir formulário"
        size="sm"
      >
        <p className="text-sm text-slate-600 mb-5">
          Tem certeza? Todas as respostas salvas também serão excluídas. Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(null)}>Cancelar</Button>
          <Button variant="danger" onClick={() => deleting && deleteForm(deleting)}>Excluir</Button>
        </div>
      </Modal>
    </div>
  )
}
