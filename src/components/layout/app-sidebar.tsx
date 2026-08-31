'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS, type NavItem } from '@/lib/nav'

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const active =
    item.href === '/dashboard'
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + '/')
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all',
        active
          ? 'bg-white/85 text-blue-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_4px_rgba(15,23,42,0.06)] ring-1 ring-blue-500/20'
          : 'text-slate-600 hover:bg-white/60 hover:text-slate-900',
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-blue-500' : 'text-slate-500')} />
      <span>{item.title}</span>
    </Link>
  )
}

export function AppSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-glass-hairline bg-white/55 backdrop-blur-xl md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-glass-hairline px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#5e5ce6] to-[#0a84ff] text-white shadow-[0_2px_8px_rgba(10,132,255,0.35)]">
          <ShieldCheck className="h-4.5 w-4.5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold text-slate-900">契通 Compact</div>
          <div className="text-[11px] text-slate-500">项目合同管理系统</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>
      <div className="border-t border-glass-hairline px-5 py-3 text-[11px] text-slate-500">
        Compact v0.1 · 契通
      </div>
    </aside>
  )
}
