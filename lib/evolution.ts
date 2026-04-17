/**
 * lib/evolution.ts — Client-side Evolution API helpers
 *
 * Todos os métodos chamam as rotas Next.js em /api/whatsapp/*
 * que por sua vez chamam a Evolution API no servidor.
 * Nunca use este arquivo em Route Handlers — use lib/evolutionServer.ts.
 */

export type ConnectionState = 'open' | 'close' | 'connecting' | 'qr' | 'unknown'

/** POST /api/whatsapp/connect — cria instância e retorna QR base64 */
export async function connectInstance(): Promise<{
  success?: boolean
  status: string
  qrCode?: string
  error?: string
}> {
  const res = await fetch('/api/whatsapp/connect', { method: 'POST' })
  if (!res.ok) throw new Error('Falha ao conectar')
  return res.json()
}

/** GET /api/whatsapp/status */
export async function getConnectionState(): Promise<ConnectionState> {
  try {
    const res = await fetch('/api/whatsapp/status')
    if (!res.ok) return 'unknown'
    const data = await res.json()
    return data.status === 'connected' ? 'open' : (data.status as ConnectionState) ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

/** GET /api/whatsapp/chats */
export async function getChats(): Promise<ChatItem[]> {
  try {
    const res = await fetch('/api/whatsapp/chats')
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/** GET /api/whatsapp/messages */
export async function getMessages(remoteJid: string, limit = 30): Promise<MessageRecord[]> {
  try {
    const res = await fetch(
      `/api/whatsapp/messages?remoteJid=${encodeURIComponent(remoteJid)}&limit=${limit}`
    )
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/** POST /api/whatsapp/send */
export async function sendText(number: string, text: string): Promise<void> {
  const res = await fetch('/api/whatsapp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ number, text }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Falha ao enviar mensagem')
  }
}

/** POST /api/whatsapp/logout */
export async function logoutInstance(): Promise<void> {
  await fetch('/api/whatsapp/logout', { method: 'POST' })
}

// ── Type helpers ────────────────────────────────────────────────────────────

export interface ChatItem {
  id: string
  name?: string
  pushName?: string
  lastMessage?: {
    conversation?: string
    messageTimestamp?: number
  }
  unreadCount?: number
}

export interface MessageRecord {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
  }
  message?: {
    conversation?: string
    extendedTextMessage?: { text: string }
  }
  messageTimestamp: number
  pushName?: string
}

export function getMessageText(msg: MessageRecord): string {
  return (
    msg.message?.conversation ??
    msg.message?.extendedTextMessage?.text ??
    '[mensagem de mídia]'
  )
}

export function formatPhone(jid: string): string {
  return jid.replace('@s.whatsapp.net', '').replace('@g.us', '')
}
