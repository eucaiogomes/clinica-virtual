'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import type { FormResponse, ProfessionalForm, TemplateQuestion } from '@/types'
import { ChevronDown, ChevronUp, ArrowLeft, Mail, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'

function ScoreBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-slate-400 text-xs">—</span>
  const color = pct <= 45 ? 'bg-rose-100 text-rose-700' : pct <= 70 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
  const label = pct <= 45 ? 'Atenção' : pct <= 70 ? 'Limiar' : 'Pronta'
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${color}`}>
      {pct}% · {label}
    </span>
  )
}

export default function RespostasPage() {
  const supabase = createClient()
  const params = useParams()
  const router = useRouter()
  const formId = params.id as string

  const [form, setForm] = useState<ProfessionalForm | null>(null)
  const [questions, setQuestions] = useState<TemplateQuestion[]>([])
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch form + template questions
      const { data: formData } = await supabase
        .from('professional_forms')
        .select('*, templates(title, category, template_questions(*))')
        .eq('id', formId)
        .eq('user_id', user.id)
        .single()

      if (!formData) { setLoading(false); return }

      setForm(formData as any)
      const qs = ((formData.templates as any)?.template_questions ?? [])
        .sort((a: TemplateQuestion, b: TemplateQuestion) => a.order - b.order)
      setQuestions(qs)

      // Fetch responses with answers
      const { data: rData } = await supabase
        .from('responses')
        .select('*, response_answers(*)')
        .eq('professional_form_id', formId)
        .order('created_at', { ascending: false })

      setResponses((rData as any) ?? [])
      setLoading(false)
    }
    load()
  }, [formId])

  const templateTitle = (form?.templates as any)?.title ?? 'Formulário'

  return (
    <div>
      <Header
        title="Respostas"
        subtitle={templateTitle}
        action={
          <Button variant="secondary" onClick={() => router.push('/meus-formularios')}>
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        }
      />

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Carregando respostas...</div>
      ) : responses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <p className="text-4xl mb-4">📭</p>
          <p className="font-semibold text-slate-700 mb-2">Nenhuma resposta ainda</p>
          <p className="text-sm text-slate-400">
            Compartilhe o link do formulário com seus pacientes para receber respostas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {responses.map(r => {
            const isOpen = expandedId === r.id
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Response header */}
                <button
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50 transition"
                  onClick={() => setExpandedId(isOpen ? null : r.id)}
                >
                  <div className="w-9 h-9 rounded-full bg-psi-100 flex items-center justify-center text-psi-700 text-xs font-bold shrink-0">
                    {(r.patient_name ?? '?').charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">
                      {r.patient_name ?? 'Anônimo'}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {r.patient_email && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Mail className="w-3 h-3" /> {r.patient_email}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {formatDate(r.created_at.split('T')[0])}
                      </span>
                    </div>
                  </div>

                  <ScoreBadge pct={r.score_pct ?? null} />

                  <span className="text-slate-400 ml-2">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>

                {/* Expanded answers */}
                {isOpen && (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">
                    {questions.map((q, i) => {
                      const ans = (r.response_answers ?? []).find(
                        (a: any) => a.question_id === q.id
                      )
                      return (
                        <div key={q.id}>
                          <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">
                            Pergunta {i + 1}
                          </p>
                          <p className="text-sm font-medium text-slate-700 mb-1.5">{q.question}</p>
                          {ans ? (
                            <div className="flex items-start gap-2">
                              <span className="w-4 h-4 rounded-full bg-sage-dk/10 text-sage-dk flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                ✓
                              </span>
                              <p className="text-sm text-slate-600">{ans.answer}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400 italic">Sem resposta</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
