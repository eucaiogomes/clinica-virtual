import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChats, getInstanceName } from '@/services/evolution-simple'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const instanceName = getInstanceName(user.id)
    const chats = await getChats(instanceName)

    return NextResponse.json(chats)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
