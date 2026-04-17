import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { disconnect, getInstanceName } from '@/services/evolution-simple'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const instanceName = getInstanceName(user.id)
    const result = await disconnect(instanceName)

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
