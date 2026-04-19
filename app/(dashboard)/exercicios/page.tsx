'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Template } from '@/types'
import { BookOpen, Clock, Tag, ArrowRight, Copy, Check } from 'lucide-react'

export default function ExerciciosPage() {
  const supabase = createClient()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [ctaUrl, setCtaUrl] = useState('')
  const [ctaLabel, setCtaLabel] = useState('Quero garantir minha vaga')
  const [creating, setCreating] = useState(false)
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('templates')
        .select('*')
        .order('created_at')
      setTemplates(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function openUseModal(template: Template) {
    setSelectedTemplate(template)
    setCtaUrl('')
    setCtaLabel('Quero garantir minha vaga')
    setCreatedSlug(null)
    setCopied(false)
  }

  async function createForm() {
    if (!selectedTemplate) return
    setCreating(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCreating(false); return }

    const slug = Array.from(crypto.getRandomValues(new Uint8Array(5)))
      .map(b => b.toString(36).padStart(2, '0'))
      .join('')
      .slice(0, 8)

    const { data, error } = await supabase
      .from('professional_forms')
      .insert({
        template_id: selectedTemplate.id,
        user_id: user.id,
        slug,
        cta_url: ctaUrl.trim(),
        cta_label: ctaLabel.trim() || 'Quero garantir minha vaga',
      })
      .select('slug')
      .single()

    setCreating(false)
    if (!error && data) setCreatedSlug(data.slug)
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/f/${slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const categoryColors: Record<string, string> = {
    'Ciclos e Encerramento': 'bg-terra/10 text-terra',
    'Bem-estar Emocional':   'bg-sage/10 text-sage-dk',
    'Autoestima e Limites':  'bg-gold/10 text-amber-700',
  }

  return (
    <div>
      <Header
        title="Exercícios Terapêuticos"
        subtitle="Selecione um exercício e gere seu link personalizado"
      />

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Carregando exercícios...</div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(t => (
            <div
              key={t.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col hover:shadow-md transition-shadow"
            >
              {/* Category badge */}
              <span className={`self-start text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full mb-4 ${categoryColors[t.category ?? ''] ?? 'bg-slate-100 text-slate-500'}`}>
                {t.category ?? 'Exercício'}
              </span>

              <h3 className="font-semibold text-slate-800 text-base leading-snug mb-2">
                {t.title}
              </h3>
              <p className="text-sm text-slate-500 flex-1 leading-relaxed mb-5">
                {t.description}
              </p>

              <div className="flex items-center gap-4 text-xs text-slate-400 mb-5">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {t.duration_minutes} min
                </span>
              </div>

              <Button
                onClick={() => openUseModal(t)}
                className="w-full justify-center gap-1.5 text-sm"
              >
                Usar exercício <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Modal: criar formulário */}
      <Modal
        open={!!selectedTemplate && !createdSlug}
        onClose={() => setSelectedTemplate(null)}
        title="Usar exercício"
        size="sm"
      >
        {selectedTemplate && (
          <div className="space-y-5">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">{selectedTemplate.category}</p>
              <p className="font-semibold text-slate-800 text-sm">{selectedTemplate.title}</p>
            </div>

            <Input
              label="Seu link de agendamento ou WhatsApp (opcional)"
              value={ctaUrl}
              onChange={e => setCtaUrl(e.target.value)}
              placeholder="https://wa.me/55... ou seu link de agendamento"
            />
            <Input
              label="Texto do botão de ação (opcional)"
              value={ctaLabel}
              onChange={e => setCtaLabel(e.target.value)}
              placeholder="Quero garantir minha vaga"
            />

            <p className="text-xs text-slate-400">
              Um link único será gerado para você enviar aos seus pacientes.
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setSelectedTemplate(null)}>
                Cancelar
              </Button>
              <Button onClick={createForm} loading={creating}>
                Gerar link
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: link gerado */}
      <Modal
        open={!!createdSlug}
        onClose={() => { setSelectedTemplate(null); setCreatedSlug(null) }}
        title="Link gerado com sucesso! 🌿"
        size="sm"
      >
        {createdSlug && (
          <div className="space-y-5">
            <p className="text-sm text-slate-600">
              Compartilhe esse link com seus pacientes. Cada resposta ficará salva no seu painel.
            </p>

            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
              <span className="text-sm text-slate-700 flex-1 truncate font-mono">
                {typeof window !== 'undefined' ? `${window.location.origin}/f/${createdSlug}` : `/f/${createdSlug}`}
              </span>
              <button
                onClick={() => copyLink(createdSlug)}
                className="flex items-center gap-1.5 text-xs font-medium text-psi-600 hover:text-psi-700 shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            <div className="flex justify-between gap-2">
              <Button
                variant="secondary"
                onClick={() => { setSelectedTemplate(null); setCreatedSlug(null) }}
              >
                Fechar
              </Button>
              <Button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.open(`/meus-formularios`, '_self')
                  }
                }}
              >
                Ver meus formulários
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
