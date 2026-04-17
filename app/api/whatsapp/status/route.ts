import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkConnection, getInstanceName } from '@/services/evolution-simple'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ status: 'disconnected' }, { status: 401 })
    }

    const instanceName = getInstanceName(user.id)
    const status = await checkConnection(instanceName)

    return NextResponse.json({ status })

  } catch {
    return NextResponse.json({ status: 'disconnected' })
  }
}
