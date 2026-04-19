import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { templateId, ctaUrl, ctaLabel } = await request.json()

    if (!templateId) {
      return NextResponse.json({ error: 'templateId é obrigatório' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const slug = Array.from(crypto.getRandomValues(new Uint8Array(5)))
      .map(b => b.toString(36).padStart(2, '0'))
      .join('')
      .slice(0, 8)

    const { data, error } = await supabase
      .from('professional_forms')
      .insert({
        template_id: templateId,
        user_id: user.id,
        slug,
        cta_url: ctaUrl?.trim() ?? '',
        cta_label: ctaLabel?.trim() || 'Quero garantir minha vaga',
      })
      .select('id, slug')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: data.id, slug: data.slug })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Erro interno' }, { status: 500 })
  }
}
