'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Building2, LogOut, UserCircle2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { findActiveMenu } from '@/lib/nav'
import { ROLE } from '@/lib/auth/authorize'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'

export interface TopbarUser {
  id: number
  name: string
  username: string
  role: number
  companyId: number | null
}

/** 顶栏公司选择 cookie 名(与 src/lib/auth/company-context.ts 一致) */
const COMPANY_COOKIE = 'company_id'

const ROLE_LABEL: Record<number, { label: string; className: string }> = {
  1: { label: '超级管理员', className: 'bg-red-50 text-red-600 border-red-200' },
  2: { label: '管理员', className: 'bg-orange-50 text-orange-600 border-orange-200' },
  3: { label: '财务', className: 'bg-blue-50 text-blue-600 border-blue-200' },
  4: { label: '普通成员', className: 'bg-white/60 text-slate-600 border-glass-border-strong' },
}

interface CompanyOption {
  id: number
  name: string
}

export function Topbar({ user }: { user: TopbarUser }) {
  const pathname = usePathname()
  const router = useRouter()
  const { title } = findActiveMenu(pathname)
  const roleInfo = ROLE_LABEL[user.role] ?? ROLE_LABEL[4]

  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [current, setCurrent] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    api
      .get<{ companies: CompanyOption[]; current: number | null }>('/api/auth/company-options')
      .then((d) => {
        setCompanies(d.companies)
        setCurrent(d.current)
      })
      .catch(() => toast.error('加载公司列表失败'))
      .finally(() => setLoaded(true))
  }, [])

  // 非超管不可切换,仅展示
  const isSuperAdmin = user.role === ROLE.SUPER_ADMIN

  function onCompanyChange(v: string | null) {
    const cid = v ? Number(v) : null
    setCurrent(cid)
    // 普通 cookie,path=/,服务端 API 与页面读取它做公司过滤
    document.cookie = cid
      ? `${COMPANY_COOKIE}=${cid}; path=/; max-age=31536000; samesite=lax`
      : `${COMPANY_COOKIE}=; path=/; max-age=0`
    router.refresh()
  }

  async function onLogout() {
    try {
      await api.post('/api/auth/logout')
    } catch {
      // 忽略登出接口异常,本地清理即可
    }
    router.push('/login')
    router.refresh()
    toast.success('已退出登录')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-glass-hairline bg-white/55 px-4 backdrop-blur-xl md:px-6">
      <div className="flex items-center gap-1 text-sm">
        <span className="font-medium text-slate-900">{title || '首页'}</span>
      </div>

      <div className="flex items-center gap-3">
        {loaded && companies.length > 0 && (
          <Select
            value={current == null ? '' : String(current)}
            onValueChange={onCompanyChange}
            disabled={!isSuperAdmin}
          >
            <SelectTrigger
              className="w-fit min-w-52 max-w-72 border-glass-border-strong bg-white/60 px-3 text-slate-700 backdrop-blur data-[size=default]:h-9 hover:bg-white/75 data-placeholder:text-slate-500"
            >
              <Building2 className="h-4 w-4 shrink-0 text-slate-500" />
              <SelectValue
                placeholder={isSuperAdmin ? '全部公司' : companies[0]?.name ?? '公司'}
              />
            </SelectTrigger>
            <SelectContent className="p-1.5">
              {isSuperAdmin && (
                <SelectItem value="" label="全部公司" className="py-2 pl-3">
                  <span className="font-medium text-slate-700">全部公司</span>
                </SelectItem>
              )}
              {companies.map((c) => (
                <SelectItem key={c.id} value={String(c.id)} label={c.name} className="py-2 pl-3">
                  <span className="font-medium text-slate-700">{c.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full px-1.5 py-1 transition-colors hover:bg-white/70">
            <Avatar className="h-8 w-8 text-white">
              <AvatarFallback className="bg-gradient-to-br from-[#5e5ce6] to-[#0a84ff] text-xs text-white shadow-[0_2px_8px_rgba(10,132,255,0.35)]">
                {user.name.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left leading-tight sm:block">
              <div className="text-sm font-medium text-slate-900">{user.name}</div>
              <Badge variant="outline" className={`mt-0.5 h-4 px-1.5 text-[10px] ${roleInfo.className}`}>
                {roleInfo.label}
              </Badge>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="text-sm font-medium">{user.name}</div>
                <div className="text-xs text-slate-500">@{user.username}</div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <UserCircle2 className="h-4 w-4" /> 个人中心
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onLogout}>
              <LogOut className="h-4 w-4" /> 退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
