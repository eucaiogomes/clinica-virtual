'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Brain, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setEmailNotConfirmed(false)
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      console.error('Erro Supabase:', error.message)

      if (error.message.includes('Email not confirmed')) {
        setEmailNotConfirmed(true)
      } else if (error.message.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos.')
      } else {
        setError(`Erro: ${error.message}`)
      }

      setLoading(false)
      return
    }

    if (data.session) {
      router.refresh()
      router.push('/')
    }
  }

  async function resendConfirmation() {
    const supabase = createClient()
    await supabase.auth.resend({ type: 'signup', email })
    alert('E-mail de confirmação reenviado! Verifique sua caixa de entrada.')
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-psi-600 rounded-2xl mb-4 shadow-lg">
          <Brain className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Financeiro Psi</h1>
        <p className="text-slate-500 mt-1 text-sm">Bem-vinda de volta</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-6">Entrar na sua conta</h2>

        {/* Erro genérico */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* E-mail não confirmado */}
        {emailNotConfirmed && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <p className="text-amber-800 font-medium mb-1">E-mail ainda não confirmado</p>
            <p className="text-amber-700 text-xs mb-3">
              Verifique sua caixa de entrada (e o spam) pelo e-mail de confirmação do Supabase.
            </p>
            <button
              onClick={resendConfirmation}
              className="text-xs text-amber-700 underline hover:no-underline"
            >
              Reenviar e-mail de confirmação
            </button>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-psi-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-psi-500 focus:border-transparent transition pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-psi-600 hover:bg-psi-700 text-white font-medium py-2.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</> : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Não tem conta?{' '}
          <Link href="/cadastro" className="text-psi-600 font-medium hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  )
}
