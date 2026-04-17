const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || 'http://localhost:8080'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '123456'

async function evolutionRequest(method: string, endpoint: string, body: any = null) {
  const url = `${EVOLUTION_BASE_URL}${endpoint}`
  const options: RequestInit = {
    method,
    headers: {
      'apikey': EVOLUTION_API_KEY,
      'Content-Type': 'application/json',
    },
  }

  if (body) options.body = JSON.stringify(body)

  const response = await fetch(url, options)

  if (!response.ok && response.status !== 403 && response.status !== 409) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Erro na Evolution API: ${response.status}`)
  }

  return response.json().catch(() => ({}))
}

export const evolutionService = {
  // Nome único baseado no ID do usuário
  getInstanceName: (userId: string) => `user_${userId}`,

  // 1. Cria a instância (ignora se já existir)
  createInstance: async (instanceName: string) => {
    try {
      await evolutionRequest('POST', '/instance/create', {
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      })
    } catch (error) {
      console.log(`Instância ${instanceName} já existe ou ocorreu um erro.`)
    }
  },

  // 2. Busca o QR Code em Base64
  getQRCode: async (instanceName: string) => {
    const data = await evolutionRequest('GET', `/instance/connect/${instanceName}`)
    if (data && data.base64) {
      return data.base64
    }
    return null
  },

  // 3. Verifica o Status da Conexão
  getConnectionState: async (instanceName: string) => {
    try {
      const data = await evolutionRequest('GET', `/instance/connectionState/${instanceName}`)
      const state = data?.instance?.state || data?.state
      return state === 'open' ? 'connected' : 'disconnected'
    } catch (error) {
      return 'disconnected'
    }
  },

  // 4. Busca os chats da instância
  getChats: async (instanceName: string) => {
    try {
      const data = await evolutionRequest('POST', `/chat/findChats/${instanceName}`, {})
      return Array.isArray(data) ? data : []
    } catch (error) {
      return []
    }
  },

  // 5. Busca mensagens de um chat
  getMessages: async (instanceName: string, remoteJid: string, limit = 30) => {
    try {
      const data = await evolutionRequest('POST', `/chat/findMessages/${instanceName}`, {
        where: { key: { remoteJid } },
        limit
      })
      return data?.messages?.records || []
    } catch (error) {
      return []
    }
  },

  // 6. Envia mensagem
  sendText: async (instanceName: string, number: string, text: string) => {
    return evolutionRequest('POST', `/message/sendText/${instanceName}`, { number, text })
  },

  // 7. Desconectar
  logoutInstance: async (instanceName: string) => {
    return evolutionRequest('DELETE', `/instance/logout/${instanceName}`)
  }
}
