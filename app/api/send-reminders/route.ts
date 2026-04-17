import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTextServer, EvoConfig } from '@/lib/evolutionServer'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: settings } = await supabase
    .from('automation_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Config: usa automation_settings se disponível, senão fallback para env
  const evoConfig: EvoConfig = {
    url:      settings?.evolution_url      || process.env.EVOLUTION_BASE_URL || '',
    key:      settings?.evolution_key      || process.env.EVOLUTION_API_KEY  || '',
    instance: settings?.evolution_instance || `user_${user.id}`,
  }

  if (!evoConfig.url || !evoConfig.key) {
    return NextResponse.json(
      { error: 'Evolution API não configurada. Vá em Automações → IA Recepcionista.' },
      { status: 400 }
    )
  }

  // Janela de tempo: hoje + próximas N horas
  const now = new Date()
  const hours = settings?.reminder_hours ?? 24
  const future = new Date(now.getTime() + hours * 3600 * 1000)
  const todayStr  = now.toISOString().split('T')[0]
  const futureStr = future.toISOString().split('T')[0]

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, date, price, patients(name, phone)')
    .eq('user_id', user.id)
    .gte('date', todayStr)
    .lte('date', futureStr)

  const template =
    settings?.reminder_message ||
    'Olá {nome}! 💜 Lembrando da nossa sessão em {data}. Qualquer dúvida me chama. Até já!'

  const results: { name: string; phone: string; status: string }[] = []

  for (const s of sessions ?? []) {
    const patient = s.patients as unknown as { name: string; phone: string } | null
    if (!patient?.phone) continue

    const text = template
      .replace(/{nome}/g, patient.name)
      .replace(/{data}/g, new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR'))
      .replace(/{valor}/g, `R$ ${Number(s.price).toFixed(2).replace('.', ',')}`)

    try {
      await sendTextServer(evoConfig, patient.phone, text)

      await supabase.from('automation_logs').insert({
        user_id: user.id,
        type:    'reminder',
        phone:   patient.phone,
        patient: patient.name,
        message: `Lembrete enviado para ${patient.name} (sessão ${s.date})`,
        status:  'success',
      })

      results.push({ name: patient.name, phone: patient.phone, status: 'enviado' })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)

      await supabase.from('automation_logs').insert({
        user_id: user.id,
        type:    'reminder',
        phone:   patient.phone,
        patient: patient.name,
        message: `Falha ao enviar lembrete: ${msg}`,
        status:  'error',
      })

      results.push({ name: patient.name, phone: patient.phone, status: 'erro' })
    }
  }

  return NextResponse.json({ total: results.length, results })
}
