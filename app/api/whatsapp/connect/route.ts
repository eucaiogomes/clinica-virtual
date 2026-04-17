import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createInstance,
  getQRCode,
  getInstanceName,
  checkConnection
} from '@/services/evolution-simple'

export async function POST() {
  try {
    // 1. Autentica usuário
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const instanceName = getInstanceName(user.id)

    // 2. Verifica se já está conectado
    const currentStatus = await checkConnection(instanceName)
    if (currentStatus === 'connected') {
      return NextResponse.json({ status: 'connected', qrCode: null })
    }

    // 3. Cria instância (se não existir)
    await createInstance(instanceName)

    // 4. Tenta pegar o QR Code (pode não estar pronto ainda — Baileys demora ~2-5s)
    const qrCode = await getQRCode(instanceName)

    // 5. Retorna QR ou estado "connecting" para o frontend continuar tentando
    return NextResponse.json({
      status: qrCode ? 'pending' : 'connecting',
      qrCode: qrCode ?? null,
    })

  } catch (error: any) {
    console.error('Erro connect:', error)
    return NextResponse.json({
      error: 'Erro interno. Tente novamente.'
    }, { status: 500 })
  }
}
