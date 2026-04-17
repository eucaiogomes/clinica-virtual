'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendText } from '@/lib/evolution'
import { Session } from '@/types'
import { getMonthRange, formatCurrency } from '@/lib/utils'
import {
  Video,
  Copy,
  Check,
  Send,
  CalendarDays,
  Tag,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
} from 'lucide-react'

interface QuickToolsProps {
  connected: boolean
  selectedPhone?: string
  selectedName?: string
}

const TEMPLATES = [
  {
    id: 'lembrete',
    label: 'Lembrete de sessão',
    emoji: '🔔',
    text: 'Olá! Passando para lembrar que temos sessão amanhã. Qualquer dúvida me chama. Até lá! 💜',
  },
  {
    id: 'confirmacao',
    label: 'Confirmação de agendamento',
    emoji: '✅',
    text: 'Olá! Seu agendamento está confirmado. Aguardo você no horário combinado! 😊',
  },
  {
    id: 'boas_vindas',
    label: 'Boas-vindas',
    emoji: '💜',
    text: 'Olá! Que bom ter você aqui. Fico feliz em acompanhar sua jornada. Estou à disposição! 🌱',
  },
  {
    id: 'reagendamento',
    label: 'Solicitar reagendamento',
    emoji: '📅',
    text: 'Olá! Precisaria reagendar nossa próxima sessão. Você teria disponibilidade em outro horário?',
  },
  {
    id: 'pagamento',
    label: 'Cobrança de sessão',
    emoji: '💳',
    text: 'Olá! Segue o lembrete referente à nossa última sessão. Pix disponível quando quiser. Obrigada! 🙏',
  },
  {
    id: 'link_meet',
    label: 'Enviar link do Meet',
    emoji: '🎥',
    text: 'Olá! Nossa sessão será online. Acesse pelo link: [COLE O LINK AQUI] no horário combinado. 💻',
  },
]

const LABELS = ['Paciente Ativo', 'Triagem', 'Aguardando Retorno', 'Inativo', 'Plano de Saúde', 'VIP']

export function QuickTools({ connected, selectedPhone, selectedName }: QuickToolsProps) {
  const supabase = createClient()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendMsg, setSendMsg] = useState('')
  const [sendTo, setSendTo] = useState(selectedPhone ?? '')
  const [todaySessions, setTodaySessions] = useState<(Session & { patients?: { name: string } })[]>([])
  const [openSection, setOpenSection] = useState<string>('meet')
  const [label, setLabel] = useState('')
  const [labelSaved, setLabelSaved] = useState(false)
  const [sendFeedback, setSendFeedback] = useState<Record<string, 'ok' | 'err'>>({})

  useEffect(() => { setSendTo(selectedPhone ?? '') }, [selectedPhone])

  useEffect(() => {
    async function loadToday() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('sessions')
        .select('*, patients(name)')
        .eq('user_id', user.id)
        .eq('date', today)
        .order('created_at')
      setTodaySessions(data ?? [])
    }
    loadToday()
  }, [])

  async function copyTemplate(tpl: typeof TEMPLATES[0]) {
    await navigator.clipboard.writeText(tpl.text)
    setCopiedId(tpl.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function sendTemplate(tpl: typeof TEMPLATES[0]) {
    if (!sendTo) return
    setSending(true)
    try {
      await sendText(sendTo, tpl.text)
      setSendFeedback((p) => ({ ...p, [tpl.id]: 'ok' }))
      setTimeout(() => setSendFeedback((p) => { const n = { ...p }; delete n[tpl.id]; return n }), 3000)
    } catch {
      setSendFeedback((p) => ({ ...p, [tpl.id]: 'err' }))
      setTimeout(() => setSendFeedback((p) => { const n = { ...p }; delete n[tpl.id]; return n }), 3000)
    }
    setSending(false)
  }

  async function handleSendCustom() {
    if (!sendTo || !sendMsg.trim()) return
    setSending(true)
    try {
      await sendText(sendTo, sendMsg)
      setSendMsg('')
    } catch (e) {
      console.error(e)
    }
    setSending(false)
  }

  async function saveLabel() {
    if (!selectedPhone || !label) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('contact_labels').upsert(
      { user_id: user.id, phone: selectedPhone, name: selectedName ?? '', label },
      { onConflict: 'user_id,phone' }
    )
    setLabelSaved(true)
    setTimeout(() => setLabelSaved(false), 2000)
  }

  function Section({
    id, title, icon: Icon, children,
  }: { id: string; title: string; icon: React.ElementType; children: React.ReactNode }) {
    const open = openSection === id
    return (
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        <button
          onClick={() => setOpenSection(open ? '' : id)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition text-left"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Icon className="w-4 h-4 text-psi-500" />
            {title}
          </span>
          {open
            ? <ChevronDown className="w-4 h-4 text-slate-400" />
            : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </button>
        {open && <div className="p-3 space-y-2 bg-white">{children}</div>}
      </div>
    )
  }

  return (
    <div className="w-72 shrink-0 space-y-3 overflow-y-auto">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Ferramentas rápidas</p>

      {/* Google Meet */}
      <Section id="meet" title="Google Meet" icon={Video}>
        <button
          onClick={() => window.open('https://meet.google.com/new', '_blank')}
          className="w-full flex items-center gap-2 px-3 py-2.5 bg-psi-600 hover:bg-psi-700 text-white text-sm font-medium rounded-xl transition"
        >
          <Video className="w-4 h-4" />
          Criar nova sala
          <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-70" />
        </button>
        <p className="text-xs text-slate-400 text-center">Abre uma nova sala do Google Meet</p>
      </Section>

      {/* Envio rápido */}
      {connected && (
        <Section id="send" title="Envio rápido" icon={Send}>
          <input
            value={sendTo}
            onChange={(e) => setSendTo(e.target.value)}
            placeholder="Número (ex: 5511999990000)"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-psi-500"
          />
          <textarea
            value={sendMsg}
            onChange={(e) => setSendMsg(e.target.value)}
            placeholder="Digite a mensagem..."
            rows={3}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-psi-500"
          />
          <button
            onClick={handleSendCustom}
            disabled={sending || !sendTo || !sendMsg.trim()}
            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Enviar via WhatsApp
          </button>
        </Section>
      )}

      {/* Templates */}
      <Section id="templates" title="Templates de mensagem" icon={Copy}>
        {selectedPhone && connected && (
          <p className="text-xs text-psi-600 font-medium bg-psi-50 px-2 py-1 rounded-lg truncate">
            → {selectedName ?? selectedPhone}
          </p>
        )}
        <div className="space-y-1.5">
          {TEMPLATES.map((tpl) => (
            <div key={tpl.id} className="flex items-start gap-1 group">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">
                  {tpl.emoji} {tpl.label}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{tpl.text.slice(0, 45)}…</p>
              </div>
              <div className="flex gap-0.5 shrink-0">
                <button
                  title="Copiar"
                  onClick={() => copyTemplate(tpl)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                >
                  {copiedId === tpl.id
                    ? <Check className="w-3 h-3 text-emerald-500" />
                    : <Copy className="w-3 h-3" />}
                </button>
                {connected && sendTo && (
                  <button
                    title={
                      sendFeedback[tpl.id] === 'ok' ? '✓ Enviado!'
                      : sendFeedback[tpl.id] === 'err' ? '✗ Erro'
                      : 'Enviar'
                    }
                    onClick={() => sendTemplate(tpl)}
                    disabled={sending}
                    className={`p-1.5 rounded-lg transition disabled:opacity-40 ${
                      sendFeedback[tpl.id] === 'ok'
                        ? 'bg-emerald-50 text-emerald-600'
                        : sendFeedback[tpl.id] === 'err'
                        ? 'bg-rose-50 text-rose-500'
                        : 'hover:bg-green-50 text-slate-400 hover:text-green-600'
                    }`}
                  >
                    <Send className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Etiquetar contato */}
      {selectedPhone && (
        <Section id="label" title="Etiquetar contato" icon={Tag}>
          <p className="text-xs text-slate-500 truncate">{selectedName ?? selectedPhone}</p>
          <div className="flex flex-wrap gap-1.5">
            {LABELS.map((l) => (
              <button
                key={l}
                onClick={() => setLabel(l)}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  label === l
                    ? 'bg-psi-600 text-white border-psi-600'
                    : 'border-slate-200 text-slate-600 hover:border-psi-300 hover:text-psi-600'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            onClick={saveLabel}
            disabled={!label}
            className="w-full py-2 bg-psi-600 hover:bg-psi-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-40"
          >
            {labelSaved ? '✓ Salvo!' : 'Salvar etiqueta'}
          </button>
        </Section>
      )}

      {/* Sessões de hoje */}
      <Section id="today" title="Sessões de hoje" icon={CalendarDays}>
        {todaySessions.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">Nenhuma sessão hoje.</p>
        ) : (
          <div className="space-y-1.5">
            {todaySessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-lg hover:bg-psi-50 transition"
              >
                <p className="text-xs font-medium text-slate-700">
                  {(s.patients as { name: string } | undefined)?.name ?? '—'}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{formatCurrency(Number(s.price))}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.is_paid ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
