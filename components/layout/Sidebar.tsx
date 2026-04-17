'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Package,
  Building2,
  Receipt,
  BarChart3,
  Target,
  Brain,
  LogOut,
  MessageSquare,
  Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'

const navItems = [
  { href: '/',           icon: LayoutDashboard, label: 'Dashboard',  group: 'main' },
  { href: '/pacientes',  icon: Users,           label: 'Pacientes',  group: 'main' },
  { href: '/sessoes',    icon: CalendarDays,    label: 'Sessões',    group: 'main' },
  { href: '/pacotes',    icon: Package,         label: 'Pacotes',    group: 'main' },
  { href: '/clinicas',   icon: Building2,       label: 'Clínicas',   group: 'main' },
  { href: '/despesas',   icon: Receipt,         label: 'Despesas',   group: 'main' },
  { href: '/relatorios', icon: BarChart3,       label: 'Relatórios', group: 'main' },
  { href: '/metas',      icon: Target,          label: 'Metas',      group: 'main' },
  { href: '/whatsapp',    icon: MessageSquare, label: 'WhatsApp',    group: 'tools' },
  { href: '/automacoes',  icon: Zap,           label: 'Automações',  group: 'tools' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [profile, setProfile] = useState<{ name: string; email: string } | null>(null)

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .single()
      setProfile(data ?? { name: user.email ?? '', email: user.email ?? '' })
    }
    loadProfile()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-slate-100 flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div className="w-9 h-9 bg-psi-600 rounded-xl flex items-center justify-center shadow-sm">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-slate-800 text-sm leading-tight">Financeiro Psi</p>
          <p className="text-xs text-slate-400">Gestão financeira</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {/* Grupo principal */}
        {navItems.filter((n) => n.group === 'main').map(({ href, icon: Icon, label }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-psi-50 text-psi-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-psi-600' : 'text-slate-400'}`} />
              {label}
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-psi-500" />}
            </Link>
          )
        })}

        {/* Divider + Ferramentas */}
        <div className="pt-3 pb-1">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ferramentas</p>
        </div>
        {navItems.filter((n) => n.group === 'tools').map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-green-50 text-green-700'
                  : 'text-slate-600 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-green-600' : 'text-slate-400'}`} />
              {label}
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500" />}
            </Link>
          )
        })}
      </nav>

      {/* Perfil + Logout */}
      <div className="px-3 pb-4 space-y-1">
        {profile && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50">
            <div className="w-7 h-7 rounded-full bg-psi-100 flex items-center justify-center text-psi-700 text-xs font-bold shrink-0">
              {getInitials(profile.name || profile.email)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700 truncate">{profile.name || 'Usuária'}</p>
              <p className="text-[10px] text-slate-400 truncate">{profile.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
