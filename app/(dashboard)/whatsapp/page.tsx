'use client'

import { useEffect, useRef, useState } from 'react'
import {
  connectInstance,
  getConnectionState,
  getChats,
  getMessages,
  sendText,
  logoutInstance,
  getMessageText,
  formatPhone,
  ChatItem,
  MessageRecord,
} from '@/lib/evolution'
import { QuickTools } from '@/components/whatsapp/QuickTools'
import {
  MessageSquare,
  Search,
  Send,
  Loader2,
  Wifi,
  QrCode,
  RefreshCw,
  LogOut,
  CheckCheck,
} from 'lucide-react'

type View = 'setup' | 'qr' | 'connected'

function timeAgo(ts: number) {
  const diff = Date.now() / 1000 - ts
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export default function WhatsAppPage() {
  const [view, setView] = useState<View>('setup')
  const [qrBase64, setQrBase64] = useState('')
  const [status, setStatus] = useState('Aguardando...')
  const [error, setError] = useState('')
  const [connecting, setConnecting] = useState(false)

  const [chats, setChats] = useState<ChatItem[]>([])
  const [search, setSearch] = useState('')
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null)
  const [messages, setMessages] = useState<MessageRecord[]>([])
  const [msgInput, setMsgInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingChats, setLoadingChats] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkAlreadyConnected()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function checkAlreadyConnected() {
    const state = await getConnectionState()
    if (state === 'open') {
      setView('connected')
      loadAllChats()
    }
  }

  async function handleConnect() {
    setError('')
    setConnecting(true)
    setStatus('Conectando...')
    try {
      const data = await connectInstance()
      if (data?.status === 'connected') {
        setView('connected')
        loadAllChats()
      } else if (data?.status === 'pending' || data?.status === 'connecting') {
        // QR pode ainda não estar pronto — entra na view e polling busca quando ficar disponível
        if (data?.qrCode) setQrBase64(data.qrCode)
        setView('qr')
        startPolling()
      } else {
        setError('Não foi possível conectar. Verifique se a Evolution API está rodando.')
      }
    } catch (e: unknown) {
      setError(`Erro: ${e instanceof Error ? e.message : 'Falha ao conectar.'}`)
    }
    setConnecting(false)
  }

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const state = await getConnectionState()
      if (state === 'open') {
        clearInterval(pollRef.current!)
        setView('connected')
        setStatus('Conectado')
        loadAllChats()
      } else {
        // Busca QR atualizado (pode ainda estar gerando ou ter expirado)
        try {
          const data = await connectInstance()
          if (data?.qrCode) setQrBase64(data.qrCode)
        } catch {}
      }
    }, 3000) // Verifica a cada 3 segundos para QR aparecer mais rápido
  }

  async function loadAllChats() {
    setLoadingChats(true)
    const data = await getChats()
    setChats(data)
    setLoadingChats(false)
  }

  async function selectChat(chat: ChatItem) {
    setSelectedChat(chat)
    setLoadingMsgs(true)
    const msgs = await getMessages(chat.id, 40)
    setMessages(msgs.reverse())
    setLoadingMsgs(false)
  }

  async function handleSend() {
    if (!msgInput.trim() || !selectedChat) return
    setSending(true)
    try {
      await sendText(formatPhone(selectedChat.id), msgInput)
      setMessages((prev) => [
        ...prev,
        {
          key: { remoteJid: selectedChat.id, fromMe: true, id: Date.now().toString() },
          message: { conversation: msgInput },
          messageTimestamp: Math.floor(Date.now() / 1000),
        },
      ])
      setMsgInput('')
    } catch (e) {
      console.error(e)
    }
    setSending(false)
  }

  async function handleLogout() {
    if (!confirm('Desconectar o WhatsApp?')) return
    await logoutInstance()
    if (pollRef.current) clearInterval(pollRef.current)
    setView('setup')
    setChats([])
    setSelectedChat(null)
    setMessages([])
    setQrBase64('')
  }

  const filteredChats = chats.filter((c) =>
    (c.name ?? c.pushName ?? c.id).toLowerCase().includes(search.toLowerCase())
  )

  const chatName = (c: ChatItem) => c.name ?? c.pushName ?? formatPhone(c.id)

  // ── SETUP VIEW ─────────────────────────────────────────
  if (view === 'setup') {
    return (
      <div className="flex gap-5 h-[calc(100vh-7rem)]">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 w-full max-w-md text-center">
            <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Conectar WhatsApp</h2>
            <p className="text-sm text-slate-500 mb-8">
              Conecte seu WhatsApp para conversar com seus pacientes diretamente pela plataforma.
            </p>

            {error && (
              <div className="mb-6 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm text-left">
                {error}
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 text-lg"
            >
              {connecting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Conectando...</>
              ) : (
                <><QrCode className="w-5 h-5" /> Gerar QR Code</>
              )}
            </button>
            
            <div className="mt-8 p-4 bg-slate-50 rounded-xl text-xs text-slate-500 text-left space-y-2 border border-slate-100">
              <p className="font-semibold text-slate-700">Como funciona:</p>
              <p>1. Clique no botão acima para gerar seu código QR.</p>
              <p>2. Abra o WhatsApp no seu celular e vá em <strong>Aparelhos conectados</strong>.</p>
              <p>3. Toque em <strong>Conectar aparelho</strong> e escaneie o código na tela.</p>
            </div>
          </div>
        </div>

        <QuickTools connected={false} />
      </div>
    )
  }

  // ── QR CODE VIEW ──────────────────────────────────────
  if (view === 'qr') {
    return (
      <div className="flex gap-5 h-[calc(100vh-7rem)]">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center max-w-sm w-full">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-bold text-slate-800 mb-1">Escaneie o QR Code</h2>
            <p className="text-xs text-slate-500 mb-6">
              Abra o WhatsApp no celular → Aparelhos conectados → Conectar aparelho
            </p>

            {qrBase64 ? (
              <div className="flex justify-center mb-6">
                <img
                  src={qrBase64}
                  alt="QR Code WhatsApp"
                  className="w-56 h-56 rounded-xl border-4 border-slate-100"
                />
              </div>
            ) : (
              <div className="w-56 h-56 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-4">
              <Loader2 className="w-4 h-4 animate-spin text-green-500" />
              Aguardando conexão...
            </div>

            <div className="flex justify-center mt-4">
              <button
                onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setView('setup') }}
                className="py-2 px-4 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>

        <QuickTools connected={false} />
      </div>
    )
  }

  // ── CONNECTED VIEW ────────────────────────────────────
  return (
    <div className="flex gap-0 h-[calc(100vh-7rem)] bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

      {/* Chat List */}
      <div className="w-72 shrink-0 border-r border-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-semibold text-slate-800">WhatsApp</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => loadAllChats()}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              title="Atualizar"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
              title="Desconectar"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-slate-50">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversa..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-psi-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingChats ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              {search ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa ainda.'}
            </div>
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => selectChat(chat)}
                className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition text-left border-b border-slate-50 ${
                  selectedChat?.id === chat.id ? 'bg-psi-50 border-l-2 border-l-psi-500' : ''
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-green-700 text-xs font-bold">
                  {chatName(chat).slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className="text-xs font-semibold text-slate-800 truncate">{chatName(chat)}</p>
                    {chat.lastMessage?.messageTimestamp && (
                      <span className="text-[10px] text-slate-400 ml-1 shrink-0">
                        {timeAgo(chat.lastMessage.messageTimestamp)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {chat.lastMessage?.conversation ?? '...'}
                  </p>
                </div>
                {(chat.unreadCount ?? 0) > 0 && (
                  <span className="w-4 h-4 rounded-full bg-green-500 text-white text-[9px] flex items-center justify-center shrink-0">
                    {chat.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message Window */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedChat ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageSquare className="w-12 h-12 text-slate-200 mb-3" />
            <p className="text-sm font-medium">Selecione uma conversa</p>
            <p className="text-xs mt-1">para visualizar as mensagens</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
                {chatName(selectedChat).slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{chatName(selectedChat)}</p>
                <p className="text-xs text-slate-400">{formatPhone(selectedChat.id)}</p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-600">Online</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2"
              style={{ background: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\' fill=\'%23f8f7ff\' fill-opacity=\'0.8\'/%3E%3C/svg%3E"), #fafafa' }}>
              {loadingMsgs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-8">Nenhuma mensagem.</div>
              ) : (
                messages.map((msg) => {
                  const fromMe = msg.key.fromMe
                  const text = getMessageText(msg)
                  return (
                    <div key={msg.key.id} className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm shadow-sm ${
                          fromMe
                            ? 'bg-green-500 text-white rounded-br-sm'
                            : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100'
                        }`}
                      >
                        <p className="leading-relaxed">{text}</p>
                        <div className={`flex items-center gap-1 mt-0.5 ${fromMe ? 'justify-end' : 'justify-start'}`}>
                          <span className={`text-[10px] ${fromMe ? 'text-green-100' : 'text-slate-400'}`}>
                            {timeAgo(msg.messageTimestamp)}
                          </span>
                          {fromMe && <CheckCheck className="w-3 h-3 text-green-100" />}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-slate-100 bg-white flex items-end gap-2">
              <textarea
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                }}
                placeholder="Digite uma mensagem... (Enter para enviar)"
                rows={1}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-psi-500 max-h-28"
                style={{ minHeight: '42px' }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !msgInput.trim()}
                className="w-10 h-10 rounded-xl bg-green-500 hover:bg-green-600 flex items-center justify-center text-white transition disabled:opacity-50 shrink-0"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Quick Tools */}
      <div className="border-l border-slate-100 p-4 overflow-y-auto bg-slate-50">
        <QuickTools
          connected
          selectedPhone={selectedChat ? formatPhone(selectedChat.id) : undefined}
          selectedName={selectedChat ? chatName(selectedChat) : undefined}
        />
      </div>
    </div>
  )
}
