import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Public endpoint — uses anon key, RLS policies allow anonymous inserts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface AnswerPayload {
  questionId: string
  answerIndex: number
  answer: string
}

export async function POST(request: Request) {
  try {
    const { slug, patientName, patientEmail, scorePct, answers } = await request.json() as {
      slug: string
      patientName: string
      patientEmail: string
      scorePct: number
      answers: AnswerPayload[]
    }

    if (!slug || !patientName || !patientEmail) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    // Resolve professional_form by slug
    const { data: form, error: formErr } = await supabase
      .from('professional_forms')
      .select('id, user_id')
      .eq('slug', slug)
      .single()

    if (formErr || !form) {
      return NextResponse.json({ error: 'Formulário não encontrado' }, { status: 404 })
    }

    // Insert response
    const { data: response, error: respErr } = await supabase
      .from('responses')
      .insert({
        professional_form_id: form.id,
        patient_name: patientName,
        patient_email: patientEmail,
        score_pct: scorePct,
      })
      .select('id')
      .single()

    if (respErr || !response) {
      return NextResponse.json({ error: 'Erro ao salvar resposta' }, { status: 500 })
    }

    // Insert individual answers
    if (answers?.length) {
      const rows = answers.map(a => ({
        response_id: response.id,
        question_id: a.questionId,
        answer: a.answer,
        answer_index: a.answerIndex,
      }))
      await supabase.from('response_answers').insert(rows)
    }

    // TODO: send email notification to professional
    // Get professional email: await supabase.from('profiles').select('email').eq('id', form.user_id).single()
    // Then use Resend/SendGrid/NodeMailer to notify them

    return NextResponse.json({ success: true, responseId: response.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Erro interno' }, { status: 500 })
  }
}
