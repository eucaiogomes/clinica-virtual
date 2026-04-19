import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import FormClient from './FormClient'
import styles from './quiz.module.css'

interface Props {
  params: Promise<{ slug: string }>
}

async function getFormData(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: form } = await supabase
    .from('professional_forms')
    .select('*, templates(*, template_questions(*))')
    .eq('slug', slug)
    .single()

  if (!form) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', form.user_id)
    .single()

  const questions = (form.templates?.template_questions ?? [])
    .sort((a: { order: number }, b: { order: number }) => a.order - b.order)

  return {
    form,
    template: form.templates,
    questions,
    professionalName: profile?.name ?? '',
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getFormData(slug)
  return {
    title: data?.template?.title ?? 'Exercício Terapêutico',
    description: data?.template?.description ?? 'Responda e descubra seu resultado.',
  }
}

export default async function QuizPage({ params }: Props) {
  const { slug } = await params
  const data = await getFormData(slug)

  if (!data || !data.template) {
    return (
      <div className={styles.notFound}>
        <p className={styles.notFoundTitle}>🌿</p>
        <h1 className={styles.notFoundTitle}>Exercício não encontrado</h1>
        <p className={styles.notFoundText}>
          O link que você acessou não existe ou foi removido.
        </p>
      </div>
    )
  }

  return (
    <FormClient
      slug={slug}
      template={data.template}
      questions={data.questions}
      ctaUrl={data.form.cta_url ?? ''}
      ctaLabel={data.form.cta_label ?? 'Quero garantir minha vaga'}
      professionalName={data.professionalName}
    />
  )
}
