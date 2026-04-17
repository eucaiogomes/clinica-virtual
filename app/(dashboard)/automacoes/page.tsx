'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  Bot, Bell, CreditCard, Video, Zap, Copy,
  CheckCircle2, XCircle, Clock, Loader2,
  ChevronRight, Link2, TriangleAlert,
} from 'lucide-react'

interface Settings {
  ai_enabled: boolean
  ai_prompt: string
  groq_api_key: string
  evolution_url: string
  evolution_key: string
  evolution_instance: string
  reminders_enabled: boolean
  reminder_hours: number
  reminder_message: string
  payment_enabled: boolean
  pix_key: string
  payment_message: string
  meet_enabled: boolean
  meet_message: string
}

interface LogEntry {
  id: string
  type: string
  patient: string
  phone: string
  message: string
  status: string
  created_at: string
}

const DEFAULT: Settings = {
  ai_enabled: false,
  ai_prompt: 'Você é Ana, recepcionista virtual acolhedora de uma psicóloga. Responda em português brasileiro de forma breve e empática. Para agendamentos, colete: nome completo, motivo e preferência de horário. Não faça diagnósticos.',
  groq_api_key: '',
  evolution_url: '',
  evolution_key: '',
  evolution_instance: '',
  reminders_enabled: false,
  reminder_hours: 24,
  reminder_message: 'Olá {nome}! 💜 Passando para lembrar que temos sessão em {data}. Qualquer dúvida me chama. Até já!',
  payment_enabled: false,
  pix_key: '',
  payment_message: 'Olá {nome}! Seguem os dados para pagamento da nossa sessão (R$ {valor}):\n\nChave Pix: {pix_key}\n\nObrigada! 💜',
  meet_enabled: false,
  meet_message: 'Olá {nome}! Nossa sessão será online 🎥\nAcesse: {link}\nEm caso de dúvida, me chame. Até já! 💜',
}

const typeIcon: Record<string, typeof Bot> = {
  ai_response: Bot,
  reminder:    Bell,
  payment:     CreditCard,
  meet:        Video,
  manual:      Zap,
}

const typeLabel: Record<string, string> = {
  ai_response: 'IA Respondeu',
  reminder:    'Lembrete',
  payment:     'Cobrança',
  meet:        'Link Meet',
  manual:      'Manual',
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-psi-600' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function Field({ label, value, onChange, type = 'text', rows, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; rows?: number; placeholder?: string; hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      {rows ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-psi-500"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-psi-500"
        />
      )}
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function AutomacoesPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState<Settings>(DEFAULT)
  const [userId, setUserId] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<string | null>(null)
  const [runningAction, setRunningAction] = useState<string | null>(null)
  const [copiedWebhook, setCopiedWebhook] = useState(false)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: s } = await supabase
      .from('automation_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (s) setSettings({ ...DEFAULT, ...s })

    const { data: l } = await supabase
      .from('automation_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    setLogs(l ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('automation_settings').upsert(
      { user_id: user.id, ...settings },
      { onConflict: 'user_id' }
    )
    setSaving(false)
    setActiveModal(null)
  }

  async function toggleSetting(key: keyof Settings) {
    const updated = { ...settings, [key]: !settings[key] }
    setSettings(updated)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('automation_settings').upsert(
      { user_id: user.id, ...updated },
      { onConflict: 'user_id' }
    )
  }

  async function runAction(action: string) {
    setRunningAction(action)
    setActionResult(null)
    try {
      const res = await fetch(`/api/${action}`, { method: 'POST' })
      const data = await res.json()
      if (data.error) setActionResult(`Erro: ${data.error}`)
      else if (action === 'send-reminders') {
        setActionResult(`✓ ${data.total} lembrete(s) enviado(s).`)
      } else {
        setActionResult('✓ Ação executada com sucesso!')
      }
      load()
    } catch (e) {
      setActionResult(`Erro: ${e}`)
    }
    setRunningAction(null)
  }

  async function copyWebhook() {
    const url = `${window.location.origin}/api/webhook/whatsapp/${userId}`
    await navigator.clipboard.writeText(url)
    setCopiedWebhook(true)
    setTimeout(() => setCopiedWebhook(false), 2000)
  }

  const webhookUrl = userId
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://seu-app.com'}/api/webhook/whatsapp/${userId}`
    : '...'

  const automations = [
    {
      id: 'ai',
      icon: Bot,
      color: 'psi',
      iconBg: 'bg-psi-100',
      iconColor: 'text-psi-600',
      title: 'IA Recepcionista',
      desc: 'Responde pacientes automaticamente no WhatsApp com inteligência artificial (Groq).',
      enabled: settings.ai_enabled,
      toggleKey: 'ai_enabled' as keyof Settings,
      configKey: 'ai',
      warning: !settings.groq_api_key || !settings.evolution_url,
      warningMsg: 'Configure a API Groq e a Evolution API para ativar.',
    },
    {
      id: 'reminder',
      icon: Bell,
      color: 'amber',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      title: 'Lembretes Automáticos',
      desc: 'Envia WhatsApp de lembrete para pacientes antes das sessões.',
      enabled: settings.reminders_enabled,
      toggleKey: 'reminders_enabled' as keyof Settings,
      configKey: 'reminder',
      warning: !settings.evolution_url,
      warningMsg: 'Configure a Evolution API para ativar.',
    },
    {
      id: 'payment',
      icon: CreditCard,
      color: 'emerald',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      title: 'Cobrança Automática',
      desc: 'Envia dados do Pix pelo WhatsApp automaticamente após a sessão.',
      enabled: settings.payment_enabled,
      toggleKey: 'payment_enabled' as keyof Settings,
      configKey: 'payment',
      warning: !settings.pix_key,
      warningMsg: 'Cadastre sua chave Pix para ativar.',
    },
    {
      id: 'meet',
      icon: Video,
      color: 'sky',
      iconBg: 'bg-sky-100',
      iconColor: 'text-sky-600',
      title: 'Link do Meet Automático',
      desc: 'Envia o link do Google Meet para pacientes de sessões online.',
      enabled: settings.meet_enabled,
      toggleKey: 'meet_enabled' as keyof Settings,
      configKey: 'meet',
      warning: !settings.evolution_url,
      warningMsg: 'Configure a Evolution API para ativar.',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-psi-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Zap className="w-5 h-5 text-psi-500" /> Central de Automações
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure as automações que trabalham por você 24h
        </p>
      </div>

      {/* Action result */}
      {actionResult && (
        <div className={`mb-5 p-3 rounded-xl text-sm border flex items-center gap-2 ${
          actionResult.startsWith('Erro')
            ? 'bg-rose-50 border-rose-200 text-rose-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {actionResult.startsWith('Erro')
            ? <XCircle className="w-4 h-4 shrink-0" />
            : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {actionResult}
        </div>
      )}

      {/* Automation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {automations.map((a) => (
          <div
            key={a.id}
            className={`bg-white rounded-2xl border shadow-sm p-5 transition ${
              a.enabled ? 'border-psi-100' : 'border-slate-100'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${a.iconBg} flex items-center justify-center`}>
                  <a.icon className={`w-5 h-5 ${a.iconColor}`} />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{a.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${a.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="text-xs text-slate-500">{a.enabled ? 'Ativo' : 'Inativo'}</span>
                  </div>
                </div>
              </div>
              <Toggle checked={a.enabled} onChange={() => toggleSetting(a.toggleKey)} />
            </div>

            <p className="text-xs text-slate-500 mb-3 leading-relaxed">{a.desc}</p>

            {a.warning && (
              <div className="flex items-start gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 mb-3">
                <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {a.warningMsg}
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setActiveModal(a.configKey)}
                className="flex items-center gap-1 text-xs text-psi-600 hover:text-psi-800 font-medium"
              >
                Configurar <ChevronRight className="w-3 h-3" />
              </button>

              {a.id === 'reminder' && a.enabled && (
                <button
                  onClick={() => runAction('send-reminders')}
                  disabled={runningAction === 'send-reminders'}
                  className="ml-auto flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-medium disabled:opacity-50"
                >
                  {runningAction === 'send-reminders'
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Bell className="w-3 h-3" />}
                  Enviar agora
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Webhook URL Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-4 h-4 text-psi-500" />
          <h3 className="font-semibold text-slate-800 text-sm">URL do Webhook (Evolution API)</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Cole esta URL nas configurações da sua Evolution API para que a IA Recepcionista receba as mensagens:
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 break-all font-mono">
            {webhookUrl}
          </code>
          <button
            onClick={copyWebhook}
            className="shrink-0 px-3 py-2.5 bg-psi-50 hover:bg-psi-100 border border-psi-200 rounded-xl text-xs text-psi-700 font-medium flex items-center gap-1.5 transition"
          >
            {copiedWebhook ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedWebhook ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Na Evolution API: Instâncias → sua instância → Webhook → Cole a URL acima → Events: <strong>MESSAGES_UPSERT</strong>
        </p>
        {typeof window !== 'undefined' && window.location.hostname === 'localhost' && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            <strong>Rodando localmente:</strong> A Evolution API (Docker) não consegue acessar <code>localhost:3000</code>.
            Use <strong>ngrok</strong> para criar uma URL pública e configure <code>NEXT_PUBLIC_APP_URL</code> com ela,
            ou faça deploy no <strong>Vercel</strong> para ter uma URL permanente.
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" /> Log de atividades
          </h3>
          <span className="text-xs text-slate-400">{logs.length} registros</span>
        </div>
        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Nenhuma atividade registrada ainda.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {logs.map((log) => {
              const Icon = typeIcon[log.type] ?? Zap
              return (
                <div key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    log.status === 'success' ? 'bg-emerald-50' : 'bg-rose-50'
                  }`}>
                    <Icon className={`w-3.5 h-3.5 ${log.status === 'success' ? 'text-emerald-500' : 'text-rose-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-medium text-slate-700">
                        {typeLabel[log.type] ?? log.type}
                        {log.patient ? ` — ${log.patient}` : ''}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(log.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{log.message}</p>
                  </div>
                  {log.status === 'error' && (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modais de Configuração ───────────���──────── */}

      {/* IA Recepcionista */}
      <Modal open={activeModal === 'ai'} onClose={() => setActiveModal(null)} title="IA Recepcionista" size="lg">
        <div className="space-y-4">
          <div className="bg-psi-50 border border-psi-200 rounded-xl p-3 text-xs text-psi-700">
            <strong>Como funciona:</strong> Quando um paciente manda mensagem no WhatsApp, a IA lê e responde automaticamente usando o Groq (LLaMA 3). Configure o webhook na Evolution API com a URL acima.
          </div>
          <Field
            label="Chave API do Groq *"
            value={settings.groq_api_key}
            onChange={(v) => setSettings({ ...settings, groq_api_key: v })}
            type="password"
            placeholder="gsk_..."
            hint="Obtenha em console.groq.com"
          />
          <Field
            label="URL da Evolution API *"
            value={settings.evolution_url}
            onChange={(v) => setSettings({ ...settings, evolution_url: v })}
            placeholder="https://evo.seudominio.com"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="API Key da Evolution"
              value={settings.evolution_key}
              onChange={(v) => setSettings({ ...settings, evolution_key: v })}
              type="password"
              placeholder="global-api-key"
            />
            <Field
              label="Nome da Instância"
              value={settings.evolution_instance}
              onChange={(v) => setSettings({ ...settings, evolution_instance: v })}
              placeholder="minha-clinica"
            />
          </div>
          <Field
            label="Prompt do sistema (personalidade da IA)"
            value={settings.ai_prompt}
            onChange={(v) => setSettings({ ...settings, ai_prompt: v })}
            rows={5}
            placeholder="Você é Ana, recepcionista..."
            hint="Descreva como a IA deve se comportar, quais informações coletar e o que pode ou não responder."
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setActiveModal(null)}>Cancelar</Button>
            <Button onClick={save} loading={saving}>Salvar configuração</Button>
          </div>
        </div>
      </Modal>

      {/* Lembretes */}
      <Modal open={activeModal === 'reminder'} onClose={() => setActiveModal(null)} title="Lembretes Automáticos">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
            Use <strong>{'{nome}'}</strong>, <strong>{'{data}'}</strong> e <strong>{'{valor}'}</strong> na mensagem. A Evolution API envia o WhatsApp automaticamente.
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Enviar com antecedência de</label>
            <select
              value={settings.reminder_hours}
              onChange={(e) => setSettings({ ...settings, reminder_hours: Number(e.target.value) })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-psi-500"
            >
              <option value={2}>2 horas antes</option>
              <option value={6}>6 horas antes</option>
              <option value={12}>12 horas antes</option>
              <option value={24}>1 dia antes</option>
              <option value={48}>2 dias antes</option>
            </select>
          </div>
          <Field
            label="Mensagem do lembrete"
            value={settings.reminder_message}
            onChange={(v) => setSettings({ ...settings, reminder_message: v })}
            rows={4}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setActiveModal(null)}>Cancelar</Button>
            <Button onClick={save} loading={saving}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Cobrança */}
      <Modal open={activeModal === 'payment'} onClose={() => setActiveModal(null)} title="Cobrança Automática">
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700">
            Use <strong>{'{nome}'}</strong>, <strong>{'{valor}'}</strong> e <strong>{'{pix_key}'}</strong> na mensagem.
          </div>
          <Field
            label="Chave Pix *"
            value={settings.pix_key}
            onChange={(v) => setSettings({ ...settings, pix_key: v })}
            placeholder="CPF, CNPJ, e-mail, celular ou chave aleatória"
          />
          <Field
            label="Mensagem de cobrança"
            value={settings.payment_message}
            onChange={(v) => setSettings({ ...settings, payment_message: v })}
            rows={5}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setActiveModal(null)}>Cancelar</Button>
            <Button onClick={save} loading={saving}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Meet */}
      <Modal open={activeModal === 'meet'} onClose={() => setActiveModal(null)} title="Link do Meet Automático">
        <div className="space-y-4">
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-700">
            Use <strong>{'{nome}'}</strong>, <strong>{'{link}'}</strong> e <strong>{'{data}'}</strong> na mensagem. O link é gerado automaticamente no formato Google Meet.
          </div>
          <Field
            label="Mensagem com link do Meet"
            value={settings.meet_message}
            onChange={(v) => setSettings({ ...settings, meet_message: v })}
            rows={4}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setActiveModal(null)}>Cancelar</Button>
            <Button onClick={save} loading={saving}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
