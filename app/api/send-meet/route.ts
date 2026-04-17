import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTextServer, EvoConfig } from '@/lib/evolutionServer'

function generateMeetCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  const seg = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${seg(3)}-${seg(4)}-${seg(3)}`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { sessionId, customLink } = body

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId é obrigatório.' }, { status: 400 })
  }

  const [{ data: settings }, { data: session }] = await Promise.all([
    supabase.from('automation_settings').select('*').eq('user_id', user.id).single(),
    supabase
      .from('sessions')
      .select('id, date, price, patients(name, phone)')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single(),
  ])

  if (!session) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })

  const patient = session.patients as unknown as { name: string; phone: string } | null
  if (!patient?.phone) {
    return NextResponse.json({ error: 'Paciente sem telefone cadastrado.' }, { status: 400 })
  }

  const meetLink = customLink || `https://meet.google.com/${generateMeetCode()}`

  const template =
    settings?.meet_message ||
    'Olá {nome}! Nossa sessão será online 🎥\nAcesse: {link}\nEm caso de dúvida me chame. Até já! 💜'

  const text = template
    .replace(/{nome}/g, patient.name)
    .replace(/{link}/g, meetLink)
    .replace(/{data}/g, new Date(session.date + 'T12:00:00').toLocaleDateString('pt-BR'))

  // Config: usa automation_settings se disponível, senão fallback para env
  const evoConfig: EvoConfig = {
    url:      settings?.evolution_url      || process.env.EVOLUTION_BASE_URL || '',
    key:      settings?.evolution_key      || process.env.EVOLUTION_API_KEY  || '',
    instance: settings?.evolution_instance || `user_${user.id}`,
  }

  try {
    await sendTextServer(evoConfig, patient.phone, text)

    await supabase.from('automation_logs').insert({
      user_id: user.id,
      type:    'meet',
      phone:   patient.phone,
      patient: patient.name,
      message: `Link do Meet enviado para ${patient.name}: ${meetLink}`,
      status:  'success',
    })

    return NextResponse.json({ ok: true, meetLink, patient: patient.name })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)

    await supabase.from('automation_logs').insert({
      user_id: user.id,
      type:    'meet',
      phone:   patient.phone,
      patient: patient.name,
      message: `Falha ao enviar link do Meet: ${msg}`,
      status:  'error',
    })

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
