import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendMessage, getInstanceName } from '@/services/evolution-simple'

export async function POST(request: Request) {
  try {
    const { number, text } = await request.json()

    if (!number || !text) {
      return NextResponse.json(
        { error: 'Número e mensagem são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const instanceName = getInstanceName(user.id)
    const result = await sendMessage(instanceName, number, text)

    return NextResponse.json({ success: true, result })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao enviar mensagem' },
      { status: 500 }
    )
  }
}
