import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTextServer, EvoConfig } from '@/lib/evolutionServer'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { sessionId } = body

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId é obrigatório.' }, { status: 400 })
  }

  const { data: settings } = await supabase
    .from('automation_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!settings || !settings.pix_key) {
    return NextResponse.json({ error: 'Chave Pix não configurada. Vá em Automações → Cobrança.' }, { status: 400 })
  }

  const { data: session } = await supabase
    .from('sessions')
    .select('id, date, price, patients(name, phone)')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })

  const patient = session.patients as unknown as { name: string; phone: string } | null
  if (!patient?.phone) {
    return NextResponse.json({ error: 'Paciente sem telefone cadastrado.' }, { status: 400 })
  }

  const template =
    settings.payment_message ||
    'Olá {nome}! Seguem os dados para pagamento:\n\nChave Pix: {pix_key}\nValor: {valor}\n\nObrigada! 💜'

  const text = template
    .replace(/{nome}/g, patient.name)
    .replace(/{pix_key}/g, settings.pix_key)
    .replace(/{valor}/g, `R$ ${Number(session.price).toFixed(2).replace('.', ',')}`)
    .replace(/{data}/g, new Date(session.date + 'T12:00:00').toLocaleDateString('pt-BR'))

  // Config: usa automation_settings se disponível, senão fallback para env
  const evoConfig: EvoConfig = {
    url:      settings.evolution_url      || process.env.EVOLUTION_BASE_URL || '',
    key:      settings.evolution_key      || process.env.EVOLUTION_API_KEY  || '',
    instance: settings.evolution_instance || `user_${user.id}`,
  }

  try {
    await sendTextServer(evoConfig, patient.phone, text)

    await supabase.from('automation_logs').insert({
      user_id: user.id,
      type:    'payment',
      phone:   patient.phone,
      patient: patient.name,
      message: `Cobrança enviada para ${patient.name}: R$ ${session.price}`,
      status:  'success',
    })

    return NextResponse.json({ ok: true, patient: patient.name })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)

    await supabase.from('automation_logs').insert({
      user_id: user.id,
      type:    'payment',
      phone:   patient.phone,
      patient: patient.name,
      message: `Falha ao enviar cobrança: ${msg}`,
      status:  'error',
    })

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
