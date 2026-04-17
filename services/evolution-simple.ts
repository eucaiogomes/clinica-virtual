const BASE_URL = process.env.EVOLUTION_BASE_URL || 'http://localhost:8080'
const API_KEY = process.env.EVOLUTION_API_KEY || ''

/**
 * Faz requisição para Evolution API
 */
async function evolutionFetch(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'apikey': API_KEY!,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || `Erro ${res.status}`)
  }

  return res.json()
}

/**
 * Gera nome único da instância baseado no userId
 */
export function getInstanceName(userId: string) {
  return `user_${userId}`
}

/**
 * PASSO 1: Cria instância (ignora se já existe)
 */
export async function createInstance(instanceName: string) {
  try {
    await evolutionFetch('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    })
  } catch (error: any) {
    if (!error.message?.includes('409')) {
      console.log('Instância já existe ou erro:', error.message)
    }
  }
}

/**
 * PASSO 2: Busca QR Code para exibir na tela
 * Retorna base64 da imagem do QR
 */
export async function getQRCode(instanceName: string): Promise<string | null> {
  try {
    const data = await evolutionFetch(`/instance/connect/${instanceName}`)
    return data?.base64 || null
  } catch {
    return null
  }
}

/**
 * PASSO 3: Verifica se já conectou
 * Retorna: 'connected' | 'disconnected'
 */
export async function checkConnection(instanceName: string): Promise<'connected' | 'disconnected'> {
  try {
    const data = await evolutionFetch(`/instance/connectionState/${instanceName}`)
    const state = data?.instance?.state || data?.state
    return state === 'open' ? 'connected' : 'disconnected'
  } catch {
    return 'disconnected'
  }
}

/**
 * Lista conversas do usuário
 */
export async function getChats(instanceName: string) {
  try {
    const data = await evolutionFetch(`/chat/findChats/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/**
 * Busca mensagens de uma conversa
 */
export async function getMessages(instanceName: string, remoteJid: string, limit = 30) {
  try {
    const data = await evolutionFetch(`/chat/findMessages/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        where: { key: { remoteJid } },
        limit,
      }),
    })
    return data?.messages?.records || []
  } catch {
    return []
  }
}

/**
 * Envia mensagem de texto
 */
export async function sendMessage(instanceName: string, phone: string, text: string) {
  const number = phone.replace(/\D/g, '')

  return evolutionFetch(`/message/sendText/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({ number, text }),
  })
}

/**
 * Desconecta WhatsApp
 */
export async function disconnect(instanceName: string) {
  try {
    await evolutionFetch(`/instance/logout/${instanceName}`, {
      method: 'DELETE',
    })
    return { success: true }
  } catch {
    return { success: false }
  }
}
