/**
 * evolutionServer.ts
 * Helper server-side para chamadas diretas à Evolution API.
 * Use APENAS em route handlers (app/api/*) — nunca em componentes client.
 *
 * Ordem de prioridade da config:
 *   1. Parâmetros explícitos (automation_settings do Supabase)
 *   2. Variáveis de ambiente (.env.local) — fallback
 */

export interface EvoConfig {
  url: string
  key: string
  instance: string
}

/** Config padrão via env (usada pelas rotas /api/whatsapp/*) */
export function getEnvConfig(userId: string): EvoConfig {
  return {
    url: process.env.EVOLUTION_BASE_URL ?? 'http://localhost:8080',
    key: process.env.EVOLUTION_API_KEY  ?? '',
    instance: `user_${userId}`,
  }
}

/** Faz request autenticado para a Evolution API */
export async function evoFetch(
  config: EvoConfig,
  path: string,
  init: RequestInit = {}
): Promise<unknown> {
  const base = config.url.replace(/\/$/, '')
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      apikey: config.key,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

  // Evolution API retorna 409 quando instância já existe — não é erro fatal
  if (!res.ok && res.status !== 409) {
    const body = await res.text().catch(() => '')
    throw new Error(`Evolution API ${res.status}: ${body}`)
  }

  return res.json().catch(() => ({}))
}

/** Envia mensagem de texto via Evolution API diretamente (server-side) */
export async function sendTextServer(
  config: EvoConfig,
  phone: string,
  text: string
): Promise<void> {
  if (!config.url || !config.key || !config.instance) {
    throw new Error(
      'Evolution API não configurada. Preencha URL, Key e Instância em Automações.'
    )
  }
  const number = phone.replace(/\D/g, '')
  await evoFetch(config, `/message/sendText/${config.instance}`, {
    method: 'POST',
    body: JSON.stringify({ number, text }),
  })
}
