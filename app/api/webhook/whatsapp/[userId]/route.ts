import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Sistema de contexto de conversas simples (em memória por instância)
const conversationHistory: Record<string, { role: string; content: string }[]> = {}

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const body = await req.json()
    const { userId } = params

    // ── Parse Evolution API webhook ──────────────────
    const data = body.data ?? body
    const remoteJid: string = data?.key?.remoteJid ?? body.phone ?? ''
    const fromMe: boolean = data?.key?.fromMe ?? body.fromMe ?? false
    const message: string =
      data?.message?.conversation ??
      data?.message?.extendedTextMessage?.text ??
      body?.text?.message ??
      ''

    // Ignora mensagens enviadas pelo bot ou sem texto
    if (fromMe || !message || !remoteJid) {
      return NextResponse.json({ ok: true })
    }

    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '')
    const senderName: string = data?.pushName ?? 'Paciente'

    // ── Busca configurações da usuária ───────────────
    const supabase = await createClient()
    const { data: settings } = await supabase
      .from('automation_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!settings?.ai_enabled || !settings?.groq_api_key) {
      return NextResponse.json({ ok: true, skip: 'ai_disabled' })
    }

    // ── Monta histórico de conversa ──────────────────
    const histKey = `${userId}:${phone}`
    if (!conversationHistory[histKey]) conversationHistory[histKey] = []

    conversationHistory[histKey].push({ role: 'user', content: message })

    // Mantém apenas as últimas 10 mensagens para não estourar tokens
    if (conversationHistory[histKey].length > 10) {
      conversationHistory[histKey] = conversationHistory[histKey].slice(-10)
    }

    // ── Chama Groq ────────────────────────────────────
    const systemPrompt =
      settings.ai_prompt ||
      'Você é uma recepcionista virtual acolhedora. Responda em português brasileiro de forma breve e profissional.'

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.groq_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory[histKey],
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    })

    if (!groqRes.ok) throw new Error(`Groq error: ${groqRes.status}`)

    const groqData = await groqRes.json()
    const aiResponse: string = groqData.choices[0].message.content

    // Adiciona resposta ao histórico
    conversationHistory[histKey].push({ role: 'assistant', content: aiResponse })

    // ── Envia resposta via Evolution API ─────────────
    const evoBase = settings.evolution_url.replace(/\/$/, '')
    const sendRes = await fetch(
      `${evoBase}/message/sendText/${settings.evolution_instance}`,
      {
        method: 'POST',
        headers: {
          apikey: settings.evolution_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number: phone, text: aiResponse }),
      }
    )

    const sendOk = sendRes.ok

    // ── Loga a atividade ─────────────────────────────
    await supabase.from('automation_logs').insert({
      user_id: userId,
      type: 'ai_response',
      phone,
      patient: senderName,
      message: `"${message.slice(0, 60)}..." → IA respondeu`,
      status: sendOk ? 'success' : 'error',
    })

    return NextResponse.json({ ok: true, replied: sendOk })
  } catch (err) {
    console.error('[webhook] erro:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

// GET apenas para testar se o webhook está ativo
export async function GET() {
  return NextResponse.json({ status: 'Webhook ativo ✓' })
}
