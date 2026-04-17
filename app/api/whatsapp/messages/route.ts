import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMessages, getInstanceName } from '@/services/evolution-simple'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const remoteJid = searchParams.get('remoteJid')
    const limit = parseInt(searchParams.get('limit') || '30', 10)

    if (!remoteJid) {
      return NextResponse.json({ error: 'remoteJid é obrigatório' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const instanceName = getInstanceName(user.id)
    const messages = await getMessages(instanceName, remoteJid, limit)

    return NextResponse.json(messages)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
